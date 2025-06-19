// ✅ webhook.ts con debugging mejorado
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
  const buf = await request.arrayBuffer();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      Buffer.from(buf),
      sig,
      endpointSecret
    );
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("🎯 Webhook event received:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log("🛒 Session details:", {
      id: session.id,
      customer_email: session.customer_details?.email,
      client_reference_id: session.client_reference_id,
      amount_total: session.amount_total,
    });

    const { data: lineItems = [] } =
      await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
        expand: ["data", "data.price.product"],
      });

    console.log("🧾 Line items recibidos:", lineItems.length, "items");
    console.log("🧾 Line items completos:", JSON.stringify(lineItems, null, 2));

    if (lineItems.length === 0) {
      console.error(
        "❌ No se encontraron line items para la sesión:",
        session.id
      );
      return new Response("No line items found", { status: 400 });
    }

    const itemNames = lineItems.map((li) => {
      const prod = (li.price as any).product as Stripe.Product;
      return prod?.name ?? li.description ?? "Producto";
    });
    const name = itemNames.join(", ");

    const amount = (session.amount_total ?? 0) / 100;

    // Buscar el primer producto para el campo product_id en orders
    let firstProductId = null;
    if (lineItems.length > 0) {
      const firstLineItem = lineItems[0];
      const stripeProduct = (firstLineItem.price as any).product;
      const stripeProdId =
        typeof stripeProduct === "string" ? stripeProduct : stripeProduct?.id;

      console.log("🔍 Primer producto Stripe ID:", stripeProdId);

      if (stripeProdId) {
        const { data: productData, error: prodSearchError } =
          await supabaseAdmin
            .from("products")
            .select("id, name, stripe_product_id")
            .eq("stripe_product_id", stripeProdId)
            .single();

        console.log("🔍 Búsqueda de producto:", {
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
        }
      }
    }

    // Insertar orden
    console.log("📝 Insertando orden con datos:", {
      checkout_session_id: session.id,
      customer_id: session.client_reference_id,
      customer_email: session.customer_details?.email,
      amount_total: amount,
      status: "paid",
      name,
      product_id: firstProductId,
    });

    const { data: orderData, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        checkout_session_id: session.id,
        customer_id: session.client_reference_id,
        customer_email: session.customer_details?.email,
        amount_total: amount,
        status: "paid",
        name,
        product_id: firstProductId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr || !orderData) {
      console.error("❌ Error creating order:", orderErr);
      return new Response("Error creating order", { status: 500 });
    }

    console.log("✅ Orden insertada exitosamente:", orderData);

    // Insertar todos los items en order_items
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
        order_id: orderData.id,
        product_id: productData.id,
        unit_price: unitAmount,
        quantity,
      };

      console.log(`✅ Item ${i + 1} preparado para insertar:`, itemToInsert);
      itemsToInsert.push(itemToInsert);
    }

    console.log("📦 Items finales para insertar:", itemsToInsert);

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

      // Verificar qué productos tienes en tu DB
      const { data: allProducts } = await supabaseAdmin
        .from("products")
        .select("id, name, stripe_product_id");

      console.log("📋 Productos disponibles en DB:", allProducts);

      return new Response("No valid products found for order items", {
        status: 400,
      });
    }
  }

  return new Response(null, { status: 200 });
};
