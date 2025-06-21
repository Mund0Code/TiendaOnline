import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  console.log("🚀 API create-checkout-session iniciada");

  try {
    // 1. Verificar que lleguen los datos
    const body = await request.text();
    console.log("📦 Body recibido (raw):", body);

    let parsedData;
    try {
      parsedData = JSON.parse(body);
      console.log("📦 Datos parseados:", parsedData);
    } catch (parseError) {
      console.error("❌ Error parseando JSON:", parseError);
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { items, customerId } = parsedData;

    // 2. Validar datos básicos
    console.log("🔍 Validando datos:", {
      itemsLength: items?.length,
      customerId,
      itemsType: typeof items,
      customerIdType: typeof customerId,
    });

    if (!items) {
      return new Response(JSON.stringify({ error: "Falta campo 'items'" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(items)) {
      return new Response(
        JSON.stringify({ error: "El campo 'items' debe ser un array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "El carrito está vacío" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!customerId) {
      return new Response(JSON.stringify({ error: "Falta customerId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Verificar variables de entorno
    const stripeKey = import.meta.env.PUBLIC_STRIPE_SECRET_KEY;
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;

    console.log("🔐 Variables de entorno:", {
      stripeKeyExists: !!stripeKey,
      stripeKeyPrefix: stripeKey?.substring(0, 10),
      supabaseUrlExists: !!supabaseUrl,
    });

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Falta configuración de Stripe" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Validar items individualmente
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`📦 Validando item ${i + 1}:`, item);

      if (!item.id) {
        return new Response(
          JSON.stringify({ error: `Item ${i + 1}: falta ID` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!item.name) {
        return new Response(
          JSON.stringify({ error: `Item ${i + 1}: falta nombre` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (typeof item.price !== "number" || item.price <= 0) {
        return new Response(
          JSON.stringify({ error: `Item ${i + 1}: precio inválido` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!item.quantity || item.quantity < 1) {
        return new Response(
          JSON.stringify({ error: `Item ${i + 1}: cantidad inválida` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Intentar inicializar Stripe
    console.log("🔄 Inicializando Stripe...");

    let stripe;
    try {
      const { Stripe } = await import("stripe");
      stripe = new Stripe(stripeKey, {
        apiVersion: "2025-05-28.basil",
      });
      console.log("✅ Stripe inicializado correctamente");
    } catch (stripeError) {
      console.error("❌ Error inicializando Stripe:", stripeError);
      return new Response(
        JSON.stringify({ error: "Error de configuración de Stripe" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Verificar conexión a Supabase
    console.log("🔄 Verificando Supabase...");

    let supabaseAdmin;
    try {
      const { supabaseAdmin: admin } = await import(
        "../../lib/supabaseAdminClient"
      );
      supabaseAdmin = admin;

      // Test de conexión
      const { data: testData, error: testError } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", customerId)
        .single();

      if (testError) {
        console.error("❌ Error conectando a Supabase:", testError);
        return new Response(
          JSON.stringify({ error: "Error de base de datos" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log(
        "✅ Supabase conectado, usuario encontrado:",
        testData?.email
      );

      if (!testData?.email) {
        return new Response(
          JSON.stringify({ error: "Usuario no encontrado" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (supabaseError) {
      console.error("❌ Error con Supabase:", supabaseError);
      return new Response(
        JSON.stringify({ error: "Error de configuración de base de datos" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 7. Crear line_items con metadata extendida para múltiples productos
    console.log("🔄 Creando line_items...");

    const line_items = items.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.name,
          metadata: {
            database_id: item.id,
            // Agregar información adicional para el webhook
            product_id: item.id,
            product_name: item.name,
          },
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    console.log("📦 Line items creados:", line_items.length);

    // 8. Crear metadata completo con TODOS los productos
    const metadata = {
      customer_id: customerId,
      // Enviar información de todos los productos al webhook
      product_ids: items.map((item) => item.id).join(","),
      product_names: items.map((item) => item.name).join("|"), // Usar | como separador
      product_quantities: items.map((item) => item.quantity).join(","),
      product_prices: items
        .map((item) => Math.round(item.price * 100))
        .join(","),
      // Mantener product_id por compatibilidad (primer producto)
      product_id: items[0].id,
      // Información adicional
      total_items: items.length.toString(),
    };

    console.log("📋 Metadata para el webhook:", metadata);

    // 9. Crear sesión de Stripe
    console.log("🔄 Creando sesión de Stripe...");

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items,
        mode: "payment",
        client_reference_id: customerId,
        metadata,
        success_url: `${import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321"}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321"}/cart`,
        // Agregar información adicional para facturas
        invoice_creation: {
          enabled: true,
        },
      });

      console.log("✅ Sesión de Stripe creada:", session.id);

      return new Response(
        JSON.stringify({
          url: session.url,
          sessionId: session.id,
          success: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (stripeSessionError) {
      console.error("❌ Error creando sesión de Stripe:", stripeSessionError);
      return new Response(
        JSON.stringify({
          error: "Error creando sesión de pago",
          details: stripeSessionError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error("❌ Error general en create-checkout-session:", err);
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
