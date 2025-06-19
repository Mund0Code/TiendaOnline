// ✅ webhook.ts - versión completa
import type { APIRoute } from "astro";
import { Stripe } from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET!;

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
    });

    // 1. Obtener line items
    const { data: lineItems = [] } =
      await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
        expand: ["data", "data.price.product"],
      });

    console.log("🧾 Line items obtenidos:", lineItems.length);

    if (lineItems.length === 0) {
      console.error("❌ No se encontraron line items");
      return new Response("No line items found", { status: 400 });
    }

    // 2. Procesar nombres y encontrar primer producto
    const itemNames = lineItems.map((li) => {
      const prod = (li.price as any).product as Stripe.Product;
      return prod?.name ?? li.description ?? "Producto";
    });
    const name = itemNames.join(", ");

    let firstProductId = null;
    const firstLineItem = lineItems[0];
    const stripeProduct = (firstLineItem.price as any).product;
    const stripeProdId =
      typeof stripeProduct === "string" ? stripeProduct : stripeProduct?.id;

    console.log("🔍 Buscando producto para Stripe ID:", stripeProdId);

    if (stripeProdId) {
      const { data: productData, error: prodSearchError } = await supabaseAdmin
        .from("products")
        .select("id, name, stripe_product_id")
        .eq("stripe_product_id", stripeProdId)
        .single();

      console.log("🔍 Resultado búsqueda producto:", {
        productData,
        prodSearchError,
      });

      if (productData) {
        firstProductId = productData.id;
        console.log(
          "✅ Producto encontrado:",
          productData.name,
          "ID:",
          firstProductId
        );
      } else {
        console.warn(
          "⚠️ Producto no encontrado en DB para Stripe ID:",
          stripeProdId
        );

        // Verificar qué productos tienes en tu DB
        const { data: allProducts } = await supabaseAdmin
          .from("products")
          .select("id, name, stripe_product_id");

        console.log("📋 Productos disponibles en DB:", allProducts);
      }
    }

    // 3. Crear orden
    const amount = (session.amount_total ?? 0) / 100;
    const orderData = {
      checkout_session_id: session.id,
      customer_id: session.client_reference_id,
      customer_email: session.customer_details?.email || "unknown",
      amount_total: amount,
      status: "paid",
      name,
      product_id: firstProductId, // Agregar el product_id del primer producto
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

    // 4. Procesar TODOS los line items para order_items
    const itemsToInsert = [];

    for (let i = 0; i < lineItems.length; i++) {
      const li = lineItems[i];
      const stripeProduct = (li.price as any).product;
      const stripeProdId =
        typeof stripeProduct === "string" ? stripeProduct : stripeProduct?.id;

      const unitAmount = (li.price as any).unit_amount ?? 0;
      const quantity = li.quantity ?? 1;

      console.log(`📦 Procesando item ${i + 1}/${lineItems.length}:`, {
        stripeProdId,
        unitAmount,
        quantity,
        description: li.description,
      });

      if (!stripeProdId) {
        console.warn(`⚠️ Item ${i + 1} no tiene stripe_product_id`);
        continue;
      }

      const { data: productData, error: prodErr } = await supabaseAdmin
        .from("products")
        .select("id, name, stripe_product_id")
        .eq("stripe_product_id", stripeProdId)
        .single();

      console.log(`🔍 Búsqueda producto item ${i + 1}:`, {
        productData,
        prodErr,
      });

      if (prodErr || !productData) {
        console.warn(
          `⚠️ Producto no encontrado en DB para Stripe ID: ${stripeProdId}`,
          prodErr
        );
        continue;
      }

      const itemToInsert = {
        order_id: insertedOrder.id,
        product_id: productData.id,
        unit_price: unitAmount,
        quantity,
      };

      console.log(`✅ Item ${i + 1} preparado para insertar:`, itemToInsert);
      itemsToInsert.push(itemToInsert);
    }

    console.log("📦 Items finales para insertar:", itemsToInsert);

    // 5. Insertar order_items
    if (itemsToInsert.length > 0) {
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
      console.error(
        "❌ No se insertaron order_items porque no se encontraron productos válidos."
      );
      return new Response("No valid products found for order items", {
        status: 400,
      });
    }
  } else {
    console.log("ℹ️ Evento ignorado:", event.type);
  }

  console.log("✅ Webhook procesado completamente");
  return new Response(null, { status: 200 });
};
