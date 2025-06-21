// ✅ webhook.ts - versión corregida para múltiples productos
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
    console.log("🛒 Session básica:", {
      id: session.id,
      customer_email: session.customer_details?.email,
      client_reference_id: session.client_reference_id,
      amount_total: session.amount_total,
      metadata: session.metadata,
    });

    // 1. Obtener line items con productos expandidos
    const { data: lineItems = [] } =
      await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
        expand: ["data.price.product"],
      });

    console.log("🧾 Line items obtenidos:", lineItems.length);
    console.log("🧾 Detalle line items:", JSON.stringify(lineItems, null, 2));

    if (lineItems.length === 0) {
      console.error("❌ No se encontraron line items");
      return new Response("No line items found", { status: 400 });
    }

    // 2. Obtener todos los productos de la base de datos
    const { data: allProducts } = await supabaseAdmin
      .from("products")
      .select("id, name, stripe_product_id");

    console.log("📋 Productos disponibles en DB:", allProducts);

    // 3. Procesar productos desde metadata y line items
    let productsFromMetadata = [];

    // Intentar obtener productos del metadata primero
    if (session.metadata?.product_ids) {
      const productIds = session.metadata.product_ids.split(",");
      const productNames = session.metadata.product_names?.split("|") || [];
      const productQuantities =
        session.metadata.product_quantities?.split(",").map(Number) || [];
      const productPrices =
        session.metadata.product_prices?.split(",").map(Number) || [];

      console.log("📋 Productos desde metadata:", {
        productIds,
        productNames,
        productQuantities,
        productPrices,
      });

      productsFromMetadata = productIds.map((id, index) => ({
        database_id: id,
        name: productNames[index] || `Producto ${index + 1}`,
        quantity: productQuantities[index] || 1,
        unit_amount: productPrices[index] || 0,
        source: "metadata",
      }));
    }

    // 4. Procesar line items para obtener productos de Stripe
    const productsFromLineItems = [];
    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i];
      const stripePrice = li.price as Stripe.Price;
      const stripeProduct = stripePrice?.product as Stripe.Product;

      console.log(`📦 Procesando line item ${i + 1}:`, {
        line_item_id: li.id,
        price_id: stripePrice?.id,
        product_id: stripeProduct?.id,
        product_name: stripeProduct?.name,
        unit_amount: stripePrice?.unit_amount,
        quantity: li.quantity,
        product_metadata: stripeProduct?.metadata,
      });

      const productInfo = {
        stripe_product_id: stripeProduct?.id,
        name: stripeProduct?.name || li.description || "Producto",
        quantity: li.quantity || 1,
        unit_amount: stripePrice?.unit_amount || 0,
        database_id:
          stripeProduct?.metadata?.database_id ||
          stripeProduct?.metadata?.product_id,
        source: "line_items",
      };

      productsFromLineItems.push(productInfo);
    }

    console.log("📦 Productos desde line items:", productsFromLineItems);

    // 5. Combinar y procesar todos los productos
    const allProductsInfo = [];

    // Priorizar metadata si está disponible y es completo
    if (productsFromMetadata.length > 0) {
      for (const metaProduct of productsFromMetadata) {
        const dbProduct = allProducts?.find(
          (p) => p.id === metaProduct.database_id
        );

        if (dbProduct) {
          allProductsInfo.push({
            database_id: dbProduct.id,
            database_name: dbProduct.name,
            quantity: metaProduct.quantity,
            unit_amount: metaProduct.unit_amount,
            source: "metadata_matched",
          });
          console.log(
            `✅ Producto desde metadata encontrado en DB:`,
            dbProduct.name
          );
        } else {
          console.warn(
            `⚠️ Producto desde metadata no encontrado en DB:`,
            metaProduct.database_id
          );
        }
      }
    }

    // Si no tenemos productos del metadata, usar line items
    if (allProductsInfo.length === 0) {
      for (const lineProduct of productsFromLineItems) {
        let dbProduct = null;

        // Buscar por database_id del metadata del producto
        if (lineProduct.database_id) {
          dbProduct = allProducts?.find(
            (p) => p.id === lineProduct.database_id
          );
        }

        // Si no se encuentra, buscar por stripe_product_id
        if (!dbProduct && lineProduct.stripe_product_id) {
          dbProduct = allProducts?.find(
            (p) => p.stripe_product_id === lineProduct.stripe_product_id
          );
        }

        // Si no se encuentra, buscar por nombre
        if (!dbProduct) {
          dbProduct = allProducts?.find(
            (p) =>
              p.name.toLowerCase().includes(lineProduct.name.toLowerCase()) ||
              lineProduct.name.toLowerCase().includes(p.name.toLowerCase())
          );
        }

        if (dbProduct) {
          allProductsInfo.push({
            database_id: dbProduct.id,
            database_name: dbProduct.name,
            quantity: lineProduct.quantity,
            unit_amount: lineProduct.unit_amount,
            source: "line_items_matched",
          });
          console.log(
            `✅ Producto desde line items encontrado:`,
            dbProduct.name
          );

          // Actualizar stripe_product_id si no está set
          if (!dbProduct.stripe_product_id && lineProduct.stripe_product_id) {
            await supabaseAdmin
              .from("products")
              .update({ stripe_product_id: lineProduct.stripe_product_id })
              .eq("id", dbProduct.id);
            console.log(
              `🔄 Actualizado stripe_product_id para ${dbProduct.name}`
            );
          }
        } else {
          console.error(`❌ No se pudo encontrar producto para:`, {
            database_id: lineProduct.database_id,
            stripe_product_id: lineProduct.stripe_product_id,
            name: lineProduct.name,
          });
        }
      }
    }

    console.log("📋 Productos finales procesados:", allProductsInfo);

    // 6. Crear orden con el primer producto (para compatibilidad)
    const firstProductId =
      allProductsInfo.length > 0 ? allProductsInfo[0].database_id : null;
    const orderName =
      allProductsInfo.map((p) => p.database_name).join(", ") ||
      productsFromLineItems.map((p) => p.name).join(", ") ||
      "Productos múltiples";

    const amount = (session.amount_total ?? 0) / 100;
    const orderData = {
      checkout_session_id: session.id,
      customer_id: session.client_reference_id,
      customer_email: session.customer_details?.email || "unknown",
      amount_total: amount,
      status: "paid",
      name: orderName,
      product_id: firstProductId, // Solo el primer producto para compatibilidad
      created_at: new Date().toISOString(),
    };

    console.log("📝 Insertando orden con datos:", orderData);

    const { data: insertedOrder, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderErr) {
      console.error("❌ Error insertando orden:", orderErr);
      return new Response("Error creating order", { status: 500 });
    }

    console.log("✅ Orden creada exitosamente:", insertedOrder);

    // 7. Insertar TODOS los order_items
    if (allProductsInfo.length > 0) {
      const itemsToInsert = allProductsInfo.map((productInfo) => ({
        order_id: insertedOrder.id,
        product_id: productInfo.database_id,
        quantity: productInfo.quantity,
        unit_price: productInfo.unit_amount,
      }));

      console.log("📦 Insertando order_items:", itemsToInsert);

      const { data: insertedItems, error: itemsErr } = await supabaseAdmin
        .from("order_items")
        .insert(itemsToInsert)
        .select();

      if (itemsErr) {
        console.error("❌ Error al insertar order_items:", itemsErr);
        return new Response("Error creating order items", { status: 500 });
      }

      console.log(
        `✅ ${itemsToInsert.length} order_items insertados exitosamente:`,
        insertedItems
      );
    } else {
      console.warn(
        "⚠️ No se insertaron order_items - no se encontraron productos válidos"
      );

      // Crear order_items básicos desde los line items aunque no se encuentren en la DB
      const fallbackItems = productsFromLineItems.map((lineProduct) => ({
        order_id: insertedOrder.id,
        product_id: null, // No hay producto en la DB
        quantity: lineProduct.quantity,
        unit_price: lineProduct.unit_amount,
        // Podrías agregar una columna 'product_name' si quieres guardar el nombre
      }));

      if (fallbackItems.length > 0) {
        console.log(
          "📦 Insertando order_items de fallback (sin product_id):",
          fallbackItems
        );

        const { error: fallbackErr } = await supabaseAdmin
          .from("order_items")
          .insert(fallbackItems);

        if (fallbackErr) {
          console.error(
            "❌ Error al insertar order_items de fallback:",
            fallbackErr
          );
        } else {
          console.log("✅ Order_items de fallback insertados");
        }
      }
    }
  } else {
    console.log("ℹ️ Evento ignorado:", event.type);
  }

  console.log("✅ Webhook procesado completamente");
  return new Response(null, { status: 200 });
};
