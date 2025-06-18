// src/pages/api/webhook.ts
import type { APIRoute } from "astro";
import { Stripe } from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const config = {
  api: {
    bodyParser: false, // ¡importantísimo!
  },
};

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET!;

export const POST: APIRoute = async ({ request }) => {
  // 1) Leemos el buffer crudo, sin tocarlo
  const buf = await request.arrayBuffer();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    // 2) Construcción con Buffer.from(buf)
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

    // A) Recuperamos line items con producto expandido
    const lineItemsRes = await stripe.checkout.sessions.listLineItems(
      session.id,
      {
        limit: 100,
        expand: ["data.price.product"],
      }
    );
    const lineItems = lineItemsRes.data;

    // B) Montamos el name concatenando todos los nombres
    const name = lineItems
      .map((li) => ((li.price as any).product as Stripe.Product).name ?? "—")
      .join(", ");

    // C) Para cada línea, busca el uuid en tu tabla products
    const itemsToInsert = [];
    for (const li of lineItems) {
      const stripeProdId = (li.price as any).product.id as string;
      const { data: prodRec, error: prodErr } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("stripe_product_id", stripeProdId)
        .single();
      if (prodErr || !prodRec) {
        console.warn(`No encuentro producto DB para Stripe ID ${stripeProdId}`);
        continue;
      }
      itemsToInsert.push({
        order_id: order.id,
        product_id: prodRec.id, // ← el UUID que tu DB entiende
        unit_price: (li.price as any).unit_amount ?? 0,
        quantity: li.quantity ?? 1,
      });
    }

    // D) Insertamos cada línea en order_items
    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(itemsToInsert);

    if (itemsErr) {
      console.error("Error creating order_items:", itemsErr);
      return new Response("Error creating order items", { status: 500 });
    }

    console.log(`✓ Order ${order.id} + ${itemsToInsert.length} items created`);
  }

  return new Response(null, { status: 200 });
};
