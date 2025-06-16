// src/pages/api/create-portal-session.ts
import { Stripe } from "stripe";
import type { APIRoute } from "astro";

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

export const post: APIRoute = async ({ request }) => {
  try {
    const { customerId } = (await request.json()) as { customerId: string };

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${import.meta.env.PUBLIC_SITE_URL}/settings`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Portal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
