// ✅ webhook.ts corregido para manejar ambas estructuras
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const { data: lineItems = [] } =
      await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
        expand: ["data", "data.price.product"],
      });

    console.log("🧾 Line items recibidos:", lineItems);

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

      if (stripeProdId) {
        const { data: productData } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("stripe_product_id", stripeProdId)
          .single();

        firstProductId = productData?.id || null;
      }
    }

    // Insertar orden con product_id del primer producto
    const { data: orderData, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        checkout_session_id: session.id,
        customer_id: session.client_reference_id,
        customer_email: session.customer_details?.email,
        amount_total: amount,
        status: "paid",
        name,
        product_id: firstProductId, // Agregamos el product_id aquí
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr || !orderData) {
      console.error("❌ Error creating order:", orderErr);
      return new Response("Error creating order", { status: 500 });
    }

    console.log("✅ Orden insertada:", orderData);

    // Insertar todos los items en order_items
    const itemsToInsert = [];
    for (const li of lineItems) {
      const stripeProduct = (li.price as any).product;
      const stripeProdId =
        typeof stripeProduct === "string" ? stripeProduct : stripeProduct?.id;

      const unitAmount = (li.price as any).unit_amount ?? 0;
      const quantity = li.quantity ?? 1;

      console.log("🔍 StripeProdId:", stripeProdId);

      const { data: productData, error: prodErr } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("stripe_product_id", stripeProdId)
        .single();

      if (prodErr || !productData) {
        console.warn(
          `⚠️ Producto no encontrado en DB para Stripe ID: ${stripeProdId}`,
          prodErr
        );
        continue;
      }

      itemsToInsert.push({
        order_id: orderData.id,
        product_id: productData.id,
        unit_price: unitAmount,
        quantity,
      });
    }

    console.log("📦 itemsToInsert:", itemsToInsert);

    if (itemsToInsert.length > 0) {
      const { error: itemsErr } = await supabaseAdmin
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsErr) {
        console.error("❌ Error al insertar order_items:", itemsErr);
        return new Response("Error creating order items", { status: 500 });
      }

      console.log(`✅ ${itemsToInsert.length} order_items insertados`);
    } else {
      console.warn(
        "⚠️ No se insertaron order_items porque no se encontraron productos."
      );
    }
  }

  return new Response(null, { status: 200 });
};
