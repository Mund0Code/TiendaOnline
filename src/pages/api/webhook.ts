// ✅ webhook.ts - versión corregida con mejor manejo de productos
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

    // 2. Obtener todos los productos de la base de datos para debugging
    const { data: allProducts } = await supabaseAdmin
      .from("products")
      .select("id, name, stripe_product_id");

    console.log("📋 Productos disponibles en DB:", allProducts);

    // 3. Procesar nombres de productos y encontrar matches
    const itemNames = [];
    let firstProductId = null;
    const itemsToInsert = [];

    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i];
      const stripePrice = li.price as Stripe.Price;
      const stripeProduct = stripePrice?.product as Stripe.Product;

      console.log(`📦 Procesando item ${i + 1}:`, {
        line_item_id: li.id,
        price_id: stripePrice?.id,
        product_id: stripeProduct?.id,
        product_name: stripeProduct?.name,
        unit_amount: stripePrice?.unit_amount,
        quantity: li.quantity,
      });

      // Agregar nombre al array
      const productName = stripeProduct?.name || li.description || "Producto";
      itemNames.push(productName);

      // Buscar en la base de datos
      let dbProduct = null;

      if (stripeProduct?.id) {
        // Buscar por stripe_product_id
        const { data: productByStripeId } = await supabaseAdmin
          .from("products")
          .select("id, name, stripe_product_id")
          .eq("stripe_product_id", stripeProduct.id)
          .single();

        if (productByStripeId) {
          dbProduct = productByStripeId;
          console.log(
            `✅ Producto encontrado por stripe_product_id:`,
            dbProduct
          );
        } else {
          // Si no se encuentra por stripe_product_id, buscar por nombre
          console.log(
            `⚠️ No encontrado por stripe_product_id, buscando por nombre: "${productName}"`
          );

          const { data: productByName } = await supabaseAdmin
            .from("products")
            .select("id, name, stripe_product_id")
            .ilike("name", `%${productName}%`)
            .single();

          if (productByName) {
            dbProduct = productByName;
            console.log(`✅ Producto encontrado por nombre:`, dbProduct);

            // Actualizar el stripe_product_id en la base de datos
            await supabaseAdmin
              .from("products")
              .update({ stripe_product_id: stripeProduct.id })
              .eq("id", productByName.id);

            console.log(
              `🔄 Actualizado stripe_product_id para producto ${productByName.id}`
            );
          }
        }
      }

      // Si encontramos el producto, preparar para order_items
      if (dbProduct) {
        if (!firstProductId) {
          firstProductId = dbProduct.id;
        }

        itemsToInsert.push({
          product_id: dbProduct.id,
          unit_price: stripePrice?.unit_amount || 0,
          quantity: li.quantity || 1,
        });
      } else {
        console.error(`❌ No se pudo encontrar producto para:`, {
          stripe_product_id: stripeProduct?.id,
          product_name: productName,
        });
      }
    }

    // 4. Usar metadata si no encontramos productos
    if (!firstProductId && session.metadata?.product_id) {
      console.log(
        "🔍 Usando product_id de metadata:",
        session.metadata.product_id
      );
      firstProductId = session.metadata.product_id;
    }

    // 5. Crear orden
    const amount = (session.amount_total ?? 0) / 100;
    const orderData = {
      checkout_session_id: session.id,
      customer_id: session.client_reference_id,
      customer_email: session.customer_details?.email || "unknown",
      amount_total: amount,
      status: "paid",
      name: itemNames.join(", "),
      product_id: firstProductId,
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

    // 6. Insertar order_items si tenemos productos válidos
    if (itemsToInsert.length > 0) {
      const finalItemsToInsert = itemsToInsert.map((item) => ({
        ...item,
        order_id: insertedOrder.id,
      }));

      console.log("📦 Insertando order_items:", finalItemsToInsert);

      const { data: insertedItems, error: itemsErr } = await supabaseAdmin
        .from("order_items")
        .insert(finalItemsToInsert)
        .select();

      if (itemsErr) {
        console.error("❌ Error al insertar order_items:", itemsErr);
      } else {
        console.log(
          `✅ ${finalItemsToInsert.length} order_items insertados:`,
          insertedItems
        );
      }
    } else {
      console.warn(
        "⚠️ No se insertaron order_items - no se encontraron productos válidos"
      );
    }
  } else {
    console.log("ℹ️ Evento ignorado:", event.type);
  }

  console.log("✅ Webhook procesado completamente");
  return new Response(null, { status: 200 });
};
