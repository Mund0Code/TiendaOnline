// src/pages/api/webhook.ts
import type { APIRoute } from "astro";
import { Stripe } from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const config = {
  api: {
    bodyParser: false, // imprescindible para leer el raw body
  },
};

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET!;

export const POST: APIRoute = async ({ request }) => {
  // 1) Leemos el raw body
  const buf = await request.arrayBuffer();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    // 2) Verificamos la firma
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

    // A) Recuperar line items con producto expandido
    const { data: lineItems = [] } =
      await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
        expand: ["data.price.product"],
      });

    console.log("🧾 Line items recibidos:", lineItems);

    // B) Construir el campo `name` uniendo todos los nombres
    const itemNames = lineItems.map((li) => {
      const prod = (li.price as any).product as Stripe.Product;
      return prod?.name ?? li.description ?? "Producto";
    });
    const name = itemNames.join(", ");

    // C) Insertar la orden
    const amount = (session.amount_total ?? 0) / 100;
    const { data: insertedOrder, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        checkout_session_id: session.id,
        customer_id: session.client_reference_id,
        customer_email: session.customer_details?.email,
        amount_total: amount,
        status: "paid",
        name,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr || !insertedOrder) {
      console.error("❌ Error creating order:", orderErr);
      return new Response("Error creating order", { status: 500 });
    }

    console.log("✅ Orden insertada:", insertedOrder);

    // D) Para cada item, buscamos el producto y creamos la relación
    const itemsToInsert = [];

    for (const li of lineItems) {
      const stripeProdId = (li.price as any).product?.id as string;
      const unitAmount = (li.price as any).unit_amount ?? 0;
      const quantity = li.quantity ?? 1;

      const { data: prodRec, error: prodErr } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("stripe_product_id", stripeProdId)
        .single();

      if (prodErr || !prodRec) {
        console.warn(
          `⚠️ Producto no encontrado en DB para Stripe ID: ${stripeProdId}`,
          prodErr
        );
        continue;
      }

      itemsToInsert.push({
        order_id: insertedOrder.id,
        product_id: prodRec.id,
        unit_price: unitAmount,
        quantity,
      });
    }

    console.log("📦 itemsToInsert:", itemsToInsert);

    if (itemsToInsert.length > 0) {
      const { error: itemsErr } = await supabaseAdmin
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsErr) {
        console.error("❌ Error al insertar order_items:", itemsErr);
        return new Response("Error creating order items", { status: 500 });
      }

      console.log(`✅ ${itemsToInsert.length} order_items insertados`);
    } else {
      console.warn(
        "⚠️ No se insertó ningún order_item porque no se encontraron productos."
      );
    }
  }

  return new Response(null, { status: 200 });
};
