// src/pages/api/create-checkout-session.ts
import type { APIRoute } from "astro";
import { Stripe } from "stripe";

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

export const POST: APIRoute = async ({ request }) => {
  const { items, customerId } = (await request.json()) as {
    items: { id: string; name: string; price: number; quantity: number }[];
    customerId: string;
  };

  const line_items = items.map((item) => ({
    price_data: {
      currency: "eur",
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    mode: "payment",
    client_reference_id: customerId, // ← aquí
    metadata: { product_id: items[0].id }, // asumiendo un solo libro

    success_url: `${import.meta.env.PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${import.meta.env.PUBLIC_SITE_URL}/cart`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
