// src/pages/api/create-checkout-session.ts
import type { APIRoute } from "astro";
import { Stripe } from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";
import { v4 as uuidv4 } from "uuid";

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
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

    // 1. Prepara line_items para Stripe
    const line_items = items.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // 2. Crea la sesión en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      client_reference_id: customerId,
      metadata: { product_id: items[0].id },
      success_url: `${import.meta.env.PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${import.meta.env.PUBLIC_SITE_URL}/cart`,
    });

    // 3. Calcula total
    const amount_total = items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    // 4. Inserta el pedido en Supabase y captura errores
    console.log("Intentando crear orden con estos datos:", {
      customerId,
      amount_total,
      checkout_session_id: session.id,
      product_id: items[0].id,
    });

    const { error: insertError } = await supabaseAdmin.from("orders").insert([
      {
        id: uuidv4(),
        customer_id: customerId,
        name: items.map((i) => i.name).join(", "),
        amount_total,
        status: "pending",
        downloaded: false,
        invoice_downloaded: false,
        product_id: items[0].id,
        checkout_session_id: session.id,
        created_at: new Date().toISOString(),
      },
    ]);

    if (insertError) {
      console.error("❌ Error insertando pedido:", insertError);
      return new Response(
        JSON.stringify({
          error: `No se pudo guardar el pedido: ${insertError.message}`,
        }),
        { status: 500 }
      );
    }

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
