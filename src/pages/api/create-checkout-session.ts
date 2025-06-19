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

    // 1. Obtener email del cliente desde profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", customerId)
      .single();

    if (profileError || !profile?.email) {
      console.error("❌ Error obteniendo email del perfil:", profileError);
      return new Response(
        JSON.stringify({
          error: "No se pudo obtener el email del cliente",
        }),
        { status: 400 }
      );
    }

    // 2. Prepara line_items para Stripe
    const line_items = items.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // 3. Crea la sesión en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      client_reference_id: customerId,
      metadata: { product_id: items[0].id },
      success_url: `${import.meta.env.PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${import.meta.env.PUBLIC_SITE_URL}/cart`,
    });

    // 4. Calcula total
    const amount_total = items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    // Justo antes de insertar en Supabase, añade este log:
    console.log("🟡 Insertando orden:", {
      customer_id: customerId,
      checkout_session_id: session.id,
      product_id: items[0].id,
      amount_total,
    });

    // 5. Inserta el pedido en Supabase
    const orderId = uuidv4();
    const { error: orderError } = await supabaseAdmin.from("orders").insert([
      {
        id: orderId,
        customer_id: customerId,
        checkout_session_id: session.id,
        product_id: items[0].id,
        amount_total,
      },
    ]);

    if (orderError) {
      console.error("❌ Error insertando orden:", orderError);
      return new Response(
        JSON.stringify({
          error: `No se pudo guardar la orden: ${orderError.message}`,
        }),
        { status: 500 }
      );
    }

    // 6. Inserta order_items por cada item
    const orderItems = items.map((item) => ({
      order_id: orderId, // usa el mismo UUID que usaste para orders
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
    }));

    const { error: orderItemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      console.error("❌ Error insertando order_items:", orderItemsError);
      return new Response(
        JSON.stringify({
          error: `No se pudo guardar los items del pedido: ${orderItemsError?.message ?? "Error desconocido"}`,
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
