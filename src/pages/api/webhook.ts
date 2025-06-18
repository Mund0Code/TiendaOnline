// src/pages/api/webhook.ts
import type { APIRoute } from "astro";
import { Stripe } from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const config = {
  api: {
    bodyParser: false, // imprescindible para leer el raw body
  },
};

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET!;

export const POST: APIRoute = async ({ request }) => {
  // 1) Leemos el raw body
  const buf = await request.arrayBuffer();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    // 2) Verificamos la firma
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

    // A) Recuperar line items con product expandido
    const { data: lineItems = [] } =
      await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
        expand: ["data.price.product"],
      });

    // B) Construir el campo `name` uniendo todos los nombres
    const itemNames = lineItems.map((li) => {
      const prod = (li.price as any).product as Stripe.Product;
      return prod.name ?? li.description ?? "Producto";
    });
    const name = itemNames.join(", ");

    // C) Insertar la orden y capturar su ID
    const amount = (session.amount_total ?? 0) / 100;
    const { data: insertedOrder, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        checkout_session_id: session.id,
        customer_id: session.client_reference_id,
        customer_email: session.customer_details?.email,
        amount_total: amount,
        status: "paid",
        name,
      })
      .select() // para devolver el objeto insertado
      .single(); // un solo registro

    if (orderErr || !insertedOrder) {
      console.error("Error creating order:", orderErr);
      return new Response("Error creating order", { status: 500 });
    }

    // D) Para cada line item, buscamos el UUID real de tu tabla products
    const itemsToInsert = [];
    for (const li of lineItems) {
      const stripeProdId = (li.price as any).product.id as string;
      const { data: prodRec, error: prodErr } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("stripe_product_id", stripeProdId)
        .single();

      if (prodErr || !prodRec) {
        console.warn(
          `⚠️ No encuentro producto DB para Stripe ID ${stripeProdId}`
        );
        continue;
      }

      itemsToInsert.push({
        order_id: insertedOrder.id, // <-- aquí usamos insertedOrder.id
        product_id: prodRec.id, // el UUID de tu tabla products
        unit_price: (li.price as any).unit_amount ?? 0,
        quantity: li.quantity ?? 1,
      });
    }

    // E) Insertamos las líneas
    if (itemsToInsert.length) {
      const { error: itemsErr } = await supabaseAdmin
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsErr) {
        console.error("Error creating order_items:", itemsErr);
        return new Response("Error creating order items", { status: 500 });
      }
    }

    console.log(
      `✅ Order ${insertedOrder.id} + ${itemsToInsert.length} items created`
    );
  }

  return new Response(null, { status: 200 });
};
