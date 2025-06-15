// src/pages/api/webhook.ts
import { Stripe } from "stripe";
import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});
const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

export const POST: APIRoute = async ({ request }) => {
  const bodyText = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      Buffer.from(bodyText),
      sig,
      endpointSecret
    );
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const productId = session.metadata?.product_id;

    // 1) Recuperar los line items EXPANDIENDO el product dentro de price
    const lineItemsRes = await stripe.checkout.sessions.listLineItems(
      session.id,
      {
        limit: 100,
        expand: ["data.price.product"],
      }
    );
    const itemNames = lineItemsRes.data.map((li) => {
      // Primero intentamos extraer product.name
      const prod = (li.price as any).product as Stripe.Product;
      if (prod && prod.name) return prod.name;
      // Luego fallback a price_data.product_data.name
      return li.price_data?.product_data?.name || "Artículo desconocido";
    });
    const name = itemNames.join(", "); // todos los nombres

    const checkoutId = session.id;
    const customerId = session.client_reference_id!;
    const amount = (session.amount_total ?? 0) / 100;
    const email = session.customer_details?.email ?? null;

    console.log("ℹ️ Insertando pedido:", {
      checkout_session_id: checkoutId,
      name,
    });

    // 2) Insert / upsert
    const { data, error } = await supabaseAdmin
      .from("orders")
      .insert(
        [
          {
            checkout_session_id: checkoutId,
            name, // guardamos el nombre real
            customer_id: customerId,
            customer_email: email,
            amount_total: amount,
            status: "paid",
            product_id: productId,
          },
        ],
        { onConflict: "checkout_session_id" }
      )
      .select();

    console.log("— Supabase insert data:", data);
    console.log("— Supabase insert error:", error);
  }

  return new Response(null, { status: 200 });
};
