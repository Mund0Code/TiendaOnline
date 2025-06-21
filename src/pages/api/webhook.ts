// ✅ webhook.ts - versión final sin duplicados
import type { APIRoute } from "astro";
import { Stripe } from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(import.meta.env.PUBLIC_STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
const endpointSecret = import.meta.env.PUBLIC_STRIPE_WEBHOOK_SECRET!;

export const POST: APIRoute = async ({ request }) => {
  console.log("🚀 WEBHOOK EJECUTÁNDOSE - timestamp:", new Date().toISOString());

  const buf = await request.arrayBuffer();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      Buffer.from(buf),
      sig,
      endpointSecret
    );
    console.log("✅ Evento verificado exitosamente:", event.type);
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    console.log("💳 PROCESANDO CHECKOUT COMPLETADO");

    const session = event.data.object as Stripe.Checkout.Session;
    console.log("🛒 Session datos:", {
      id: session.id,
      customer_email: session.customer_details?.email,
      client_reference_id: session.client_reference_id,
      amount_total: session.amount_total,
      metadata: session.metadata,
    });

    // 🔍 PASO 1: Verificar si ya existe esta orden
    const { data: existingOrder } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("checkout_session_id", session.id)
      .single();

    if (existingOrder) {
      console.log("⚠️ Esta orden ya fue procesada:", existingOrder.id);
      return new Response("Order already processed", { status: 200 });
    }

    // 🔍 PASO 2: Obtener line items de Stripe
    const { data: lineItems = [] } =
      await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
        expand: ["data.price.product"],
      });

    console.log("🧾 Line items obtenidos:", lineItems.length);

    if (lineItems.length === 0) {
      console.error("❌ No se encontraron line items");
      return new Response("No line items found", { status: 400 });
    }

    // 🔍 PASO 3: Obtener productos de la base de datos
    const { data: allProducts } = await supabaseAdmin
      .from("products")
      .select("id, name, stripe_product_id");

    console.log("📋 Productos en DB:", allProducts?.length || 0);

    // 🔍 PASO 4: Procesar productos desde METADATA (más confiable)
    const productsInfo = [];

    if (session.metadata?.product_ids) {
      console.log("📋 Procesando desde METADATA");

      const productIds = session.metadata.product_ids
        .split(",")
        .map((id) => id.trim());
      const productQuantities =
        session.metadata.product_quantities
          ?.split(",")
          .map((q) => parseInt(q.trim())) || [];
      const productPrices =
        session.metadata.product_prices
          ?.split(",")
          .map((p) => parseInt(p.trim())) || [];

      console.log("📋 Datos del metadata:", {
        productIds,
        productQuantities,
        productPrices,
      });

      for (let i = 0; i < productIds.length; i++) {
        const productId = productIds[i];
        const quantity = productQuantities[i] || 1;
        const unitPrice = productPrices[i] || 0;

        // Verificar que el producto existe en la DB
        const dbProduct = allProducts?.find((p) => p.id === productId);

        if (dbProduct) {
          productsInfo.push({
            product_id: productId,
            product_name: dbProduct.name,
            quantity: quantity,
            unit_price: unitPrice,
          });
          console.log(`✅ Producto válido: ${dbProduct.name} x${quantity}`);
        } else {
          console.warn(`⚠️ Producto no encontrado en DB: ${productId}`);
        }
      }
    }

    // 🔍 PASO 5: Si no hay metadata, procesar line items (fallback)
    if (productsInfo.length === 0) {
      console.log("📋 Procesando desde LINE ITEMS (fallback)");

      for (const li of lineItems) {
        const stripePrice = li.price as Stripe.Price;
        const stripeProduct = stripePrice?.product as Stripe.Product;

        let dbProduct = null;

        // Buscar por metadata del producto de Stripe
        if (stripeProduct?.metadata?.database_id) {
          dbProduct = allProducts?.find(
            (p) => p.id === stripeProduct.metadata.database_id
          );
        }

        // Buscar por stripe_product_id
        if (!dbProduct && stripeProduct?.id) {
          dbProduct = allProducts?.find(
            (p) => p.stripe_product_id === stripeProduct.id
          );
        }

        // Buscar por nombre similar
        if (!dbProduct && stripeProduct?.name) {
          dbProduct = allProducts?.find(
            (p) =>
              p.name.toLowerCase().includes(stripeProduct.name.toLowerCase()) ||
              stripeProduct.name.toLowerCase().includes(p.name.toLowerCase())
          );
        }

        if (dbProduct) {
          productsInfo.push({
            product_id: dbProduct.id,
            product_name: dbProduct.name,
            quantity: li.quantity || 1,
            unit_price: stripePrice?.unit_amount || 0,
          });
          console.log(`✅ Producto desde line items: ${dbProduct.name}`);
        } else {
          console.warn(`⚠️ No se pudo encontrar producto para line item:`, {
            stripe_product_id: stripeProduct?.id,
            product_name: stripeProduct?.name,
            metadata: stripeProduct?.metadata,
          });
        }
      }
    }

    console.log("📋 Productos finales a procesar:", productsInfo);

    if (productsInfo.length === 0) {
      console.error("❌ No se encontraron productos válidos");
      return new Response("No valid products found", { status: 400 });
    }

    // 🔍 PASO 6: Crear UNA SOLA orden
    const amount = (session.amount_total ?? 0) / 100;
    const orderName = productsInfo.map((p) => p.product_name).join(", ");
    const firstProductId = productsInfo[0].product_id;

    const orderData = {
      checkout_session_id: session.id,
      customer_id: session.client_reference_id,
      customer_email: session.customer_details?.email || "unknown",
      amount_total: amount,
      status: "paid",
      name: orderName,
      product_id: firstProductId, // Solo para compatibilidad
      created_at: new Date().toISOString(),
    };

    console.log("📝 Creando orden única:", orderData);

    const { data: insertedOrder, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderErr) {
      console.error("❌ Error creando orden:", orderErr);
      return new Response("Error creating order", { status: 500 });
    }

    console.log("✅ Orden creada:", insertedOrder.id);

    // 🔍 PASO 7: Crear order_items para CADA producto
    const itemsToInsert = productsInfo.map((product) => ({
      order_id: insertedOrder.id,
      product_id: product.product_id,
      quantity: product.quantity,
      unit_price: product.unit_price,
    }));

    console.log(
      `📦 Insertando ${itemsToInsert.length} order_items:`,
      itemsToInsert
    );

    const { data: insertedItems, error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(itemsToInsert)
      .select();

    if (itemsErr) {
      console.error("❌ Error insertando order_items:", itemsErr);
      return new Response("Error creating order items", { status: 500 });
    }

    console.log(
      `✅ ${insertedItems?.length || 0} order_items creados exitosamente`
    );

    // 🔍 PASO 8: Log final para verificación
    console.log("📊 RESUMEN FINAL:", {
      session_id: session.id,
      order_id: insertedOrder.id,
      total_products: productsInfo.length,
      total_order_items: insertedItems?.length || 0,
      order_name: orderName,
      amount: amount,
    });
  } else {
    console.log("ℹ️ Evento ignorado:", event.type);
  }

  console.log("✅ Webhook procesado completamente");
  return new Response(null, { status: 200 });
};
