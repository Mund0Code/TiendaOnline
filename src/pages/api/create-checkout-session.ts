import type { APIRoute } from "astro";
import { Stripe } from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

const stripe = new Stripe(import.meta.env.PUBLIC_STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { items, customerId } = (await request.json()) as {
      items: {
        id: string;
        name: string;
        price: number;
        quantity: number;
        stripe_product_id?: string;
      }[];
      customerId: string;
    };

    if (!items?.length || !customerId) {
      return new Response(
        JSON.stringify({ error: "Datos incompletos del pedido" }),
        { status: 400 }
      );
    }

    console.log("🛒 Creando checkout session para:", {
      customerId,
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
    });

    // Obtener email del perfil
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

    // Verificar y obtener productos de la base de datos
    const line_items = [];
    let firstProductId = null;

    for (const item of items) {
      console.log(`🔍 Procesando item: ${item.name} (ID: ${item.id})`);

      // Buscar el producto en la base de datos
      const { data: dbProduct, error: productError } = await supabaseAdmin
        .from("products")
        .select("id, name, stripe_product_id, stripe_price_id")
        .eq("id", item.id)
        .single();

      if (productError || !dbProduct) {
        console.error(
          `❌ Producto no encontrado en DB para ID: ${item.id}`,
          productError
        );
        return new Response(
          JSON.stringify({ error: `Producto ${item.name} no encontrado` }),
          { status: 400 }
        );
      }

      console.log(`✅ Producto encontrado en DB:`, dbProduct);

      if (!firstProductId) {
        firstProductId = dbProduct.id;
      }

      // Si ya tiene stripe_price_id, usarlo; si no, crear uno nuevo
      let priceId = dbProduct.stripe_price_id;

      if (!priceId) {
        console.log(
          `🔄 Creando precio en Stripe para producto: ${dbProduct.name}`
        );

        // Crear o obtener producto en Stripe
        let stripeProductId = dbProduct.stripe_product_id;

        if (!stripeProductId) {
          console.log(`🔄 Creando producto en Stripe: ${dbProduct.name}`);

          const stripeProduct = await stripe.products.create({
            name: dbProduct.name,
            metadata: {
              database_id: dbProduct.id,
            },
          });

          stripeProductId = stripeProduct.id;

          // Actualizar la base de datos con el stripe_product_id
          await supabaseAdmin
            .from("products")
            .update({ stripe_product_id: stripeProductId })
            .eq("id", dbProduct.id);

          console.log(`✅ Producto creado en Stripe: ${stripeProductId}`);
        }

        // Crear precio en Stripe
        const stripePrice = await stripe.prices.create({
          currency: "eur",
          unit_amount: Math.round(item.price * 100),
          product: stripeProductId,
        });

        priceId = stripePrice.id;

        // Actualizar la base de datos con el stripe_price_id
        await supabaseAdmin
          .from("products")
          .update({ stripe_price_id: priceId })
          .eq("id", dbProduct.id);

        console.log(`✅ Precio creado en Stripe: ${priceId}`);
      }

      line_items.push({
        price: priceId,
        quantity: item.quantity,
      });
    }

    console.log("📦 Line items para Stripe:", line_items);

    // Crear metadata con información de productos
    const metadata: Record<string, string> = {
      customer_id: customerId,
      product_ids: items.map((i) => i.id).join(","),
    };

    // Agregar el primer producto al metadata para compatibilidad
    if (firstProductId) {
      metadata.product_id = firstProductId;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      client_reference_id: customerId,
      metadata,
      customer_email: profile.email,
      success_url: `${import.meta.env.PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${import.meta.env.PUBLIC_SITE_URL}/cart`,
      // Habilitar facturas automáticas
      invoice_creation: {
        enabled: true,
      },
    });

    console.log("✅ Checkout session creada:", session.id);

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
