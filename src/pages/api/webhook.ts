// src/pages/api/webhook.ts
import type { APIRoute } from "astro";
import { Stripe } from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const config = {
  api: {
    bodyParser: false, // importante: deshabilitar el body parser
  },
};

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET!;

export const POST: APIRoute = async ({ request }) => {
  // 1) Leer el body sin parsear
  const buf = await request.arrayBuffer();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Solo procesamos la finalización de checkout
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // 2) Recuperar los line_items con el producto expandido
    const lineItemsRes = await stripe.checkout.sessions.listLineItems(
      session.id,
      {
        limit: 100,
        expand: ["data.price.product"],
      }
    );
    const lineItems = lineItemsRes.data;

    // 3) Construir el nombre compuesto de la orden
    const itemNames = lineItems.map((li) => {
      const product = (li.price as any).product as Stripe.Product;
      return product.name ?? "Producto sin nombre";
    });
    const name = itemNames.join(", ");

    // 4) Insertar la orden en Supabase
    const amount = (session.amount_total ?? 0) / 100;
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        checkout_session_id: session.id,
        customer_id: session.client_reference_id,
        customer_email: session.customer_details?.email ?? null,
        amount_total: amount,
        status: "paid",
        name,
      })
      .single();

    if (orderErr || !order) {
      console.error("❌ Error creando order:", orderErr);
      return new Response("Error creating order", { status: 500 });
    }

    // 5) Insertar cada línea en order_items
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
      console.error("❌ Error creando order_items:", itemsErr);
      return new Response("Error creating order items", { status: 500 });
    }

    console.log(
      `✅ Order ${order.id} creada con ${itemsToInsert.length} ítems`
    );
  }

  // Responder siempre 200 para que Stripe no reintente
  return new Response(null, { status: 200 });
};
