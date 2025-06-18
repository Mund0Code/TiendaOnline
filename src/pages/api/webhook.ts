// src/pages/api/webhook.ts
import type { APIRoute } from "astro";
import { Stripe } from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const config = {
  // Muy importante: deshabilita el body parser para leer el raw body
  api: { bodyParser: false },
};

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET!;

export const POST: APIRoute = async ({ request }) => {
  // --- LOG DE CABECERAS para depurar en Vercel ---
  console.log("▶️ Headers recibidas:", Object.fromEntries(request.headers));

  // 1) Lee el raw body como ArrayBuffer
  const buf = await request.arrayBuffer();
  const sig = request.headers.get("stripe-signature")!;
  let event: Stripe.Event;

  try {
    // 2) Verifica firma y construye evento
    event = stripe.webhooks.constructEvent(
      Buffer.from(buf),
      sig,
      endpointSecret
    );
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 3) Procesa sólo el evento de pago completado
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // A) Recupera todos los line_items con producto expandido
    const lineItemsRes = await stripe.checkout.sessions.listLineItems(
      session.id,
      {
        limit: 100,
        expand: ["data.price.product"],
      }
    );
    const lineItems = lineItemsRes.data;

    // B) Construye cadena de nombres de producto
    const itemNames = lineItems.map((li) => {
      const prod = (li.price as any).product as Stripe.Product;
      return prod.name ?? li.description ?? "Producto";
    });
    const name = itemNames.join(", ");

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
      console.error("Error creando order:", orderErr);
      return new Response("Error creating order", { status: 500 });
    }

    // D) Inserta cada línea en order_items
    const itemsToInsert = lineItems.map((li) => ({
      order_id: order.id,
      product_id: (li.price as any).product.id,
      unit_price: (li.price as any).unit_amount ?? 0,
      quantity: li.quantity ?? 1,
    }));
    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(itemsToInsert);

    if (itemsErr) {
      console.error("Error creando order_items:", itemsErr);
      return new Response("Error creating order items", { status: 500 });
    }

    console.log(`✓ Order ${order.id} + ${itemsToInsert.length} items creados`);
  }

  return new Response(null, { status: 200 });
};
