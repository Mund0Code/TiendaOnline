// src/pages/api/webhook.ts
import type { APIRoute } from "astro";
import { Stripe } from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const config = {
  api: { bodyParser: false }, // ✱ muy importante
};

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET!;

export const POST: APIRoute = async ({ request }) => {
  // 1) Obtén el cuerpo sin parsear como texto
  const bodyText = await request.text();
  const sig = request.headers.get("stripe-signature")!;
  let event: Stripe.Event;

  try {
    // 2) Construye el evento a partir del texto crudo
    event = stripe.webhooks.constructEvent(bodyText, sig, endpointSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // A) Lee line_items con producto expandido
    const lineItemsRes = await stripe.checkout.sessions.listLineItems(
      session.id,
      { limit: 100, expand: ["data.price.product"] }
    );
    const lineItems = lineItemsRes.data;

    // B) Prepara el nombre concatenado
    const name = lineItems
      .map((li) => ((li.price as any).product as Stripe.Product).name ?? "—")
      .join(", ");

    // C) Inserta la orden
    const amount = (session.amount_total ?? 0) / 100;
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        checkout_session_id: session.id,
        customer_id: session.client_reference_id,
        customer_email: session.customer_details?.email,
        amount_total: amount,
        status: "paid",
        name,
      })
      .single();
    if (orderErr || !order) {
      console.error("Error creating order:", orderErr);
      return new Response("Order insert failed", { status: 500 });
    }

    // D) Inserta las líneas
    const itemsToInsert = lineItems.map((li) => ({
      order_id: order.id,
      product_id: ((li.price as any).product as Stripe.Product).id,
      unit_price: (li.price as any).unit_amount ?? 0,
      quantity: li.quantity ?? 1,
    }));
    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(itemsToInsert);
    if (itemsErr) {
      console.error("Error creating order_items:", itemsErr);
      return new Response("Order items insert failed", { status: 500 });
    }

    console.log(`✓ Order ${order.id} + ${itemsToInsert.length} items created`);
  }

  return new Response(null, { status: 200 });
};
