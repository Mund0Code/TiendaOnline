import type { APIRoute } from "astro";
import { Stripe } from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

const stripe = new Stripe(import.meta.env.PUBLIC_STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { items, customerId } = (await request.json()) as {
      items: { id: string; name: string; price: number; quantity: number }[];
      customerId: string;
    };

    if (!items?.length || !customerId) {
      return new Response(
        JSON.stringify({ error: "Datos incompletos del pedido" }),
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", customerId)
      .single();

    if (profileError || !profile?.email) {
      console.error("❌ Error obteniendo email del perfil:", profileError);
      return new Response(
        JSON.stringify({ error: "No se pudo obtener el email del cliente" }),
        { status: 400 }
      );
    }

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
      client_reference_id: customerId,
      metadata: { product_id: items[0].id },
      success_url: `${import.meta.env.PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${import.meta.env.PUBLIC_SITE_URL}/cart`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("❌ Error general en create-checkout-session:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
};
