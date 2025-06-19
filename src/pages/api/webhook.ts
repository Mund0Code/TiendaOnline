// ✅ webhook.ts - versión simple para debug
import type { APIRoute } from "astro";
import { Stripe } from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET!;

export const POST: APIRoute = async ({ request }) => {
  // LOG BÁSICO - ESTO DEBE APARECER SIEMPRE
  console.log("🚀 WEBHOOK EJECUTÁNDOSE - timestamp:", new Date().toISOString());
  console.log(
    "🔗 Headers recibidos:",
    Object.fromEntries(request.headers.entries())
  );

  const buf = await request.arrayBuffer();
  const sig = request.headers.get("stripe-signature")!;

  console.log("📝 Signature recibida:", sig ? "✅ SÍ" : "❌ NO");
  console.log("📦 Body size:", buf.byteLength, "bytes");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      Buffer.from(buf),
      sig,
      endpointSecret
    );
    console.log("✅ Evento verificado exitosamente:", event.type);
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    console.log("💳 PROCESANDO CHECKOUT COMPLETADO");

    const session = event.data.object as Stripe.Checkout.Session;
    console.log("🛒 Session básica:", {
      id: session.id,
      customer_email: session.customer_details?.email,
      client_reference_id: session.client_reference_id,
      amount_total: session.amount_total,
    });

    // CREAR ORDEN BÁSICA PRIMERO
    const orderData = {
      checkout_session_id: session.id,
      customer_id: session.client_reference_id,
      customer_email: session.customer_details?.email || "unknown",
      amount_total: (session.amount_total ?? 0) / 100,
      status: "paid",
      name: "Test Order",
      created_at: new Date().toISOString(),
    };

    console.log("📝 Insertando orden básica:", orderData);

    const { data: insertedOrder, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderErr) {
      console.error("❌ Error insertando orden:", orderErr);
      return new Response("Error creating order", { status: 500 });
    }

    console.log("✅ Orden creada exitosamente:", insertedOrder);

    // Ahora intentamos obtener line items
    try {
      const { data: lineItems = [] } =
        await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 100,
          expand: ["data", "data.price.product"],
        });

      console.log("🧾 Line items obtenidos:", lineItems.length);
      console.log(
        "🧾 Primer line item:",
        lineItems[0] ? JSON.stringify(lineItems[0], null, 2) : "Ninguno"
      );

      if (lineItems.length > 0) {
        console.log("🔄 Procesando line items...");
        // Aquí procesarías los line items
      } else {
        console.warn("⚠️ No se encontraron line items");
      }
    } catch (lineItemsError) {
      console.error("❌ Error obteniendo line items:", lineItemsError);
    }
  } else {
    console.log("ℹ️ Evento ignorado:", event.type);
  }

  console.log("✅ Webhook procesado completamente");
  return new Response(null, { status: 200 });
};
