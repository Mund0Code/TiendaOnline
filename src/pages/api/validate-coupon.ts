// src/pages/api/validate-coupon.ts - Versión con normalización automática
import type { APIRoute } from "astro";
import { Stripe } from "stripe";

const stripe = new Stripe(import.meta.env.PUBLIC_STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

// Función para generar diferentes variaciones del código de cupón
function normalizeCouponCode(code: string): string[] {
  const clean = code.trim();

  // Crear variaciones del código para intentar
  const variations = [
    clean.toLowerCase(), // bienvenida25
    clean.toUpperCase(), // BIENVENIDA25
    clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase(), // Bienvenida25
    clean.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(), // sin caracteres especiales minúsculas
    clean.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(), // sin caracteres especiales mayúsculas
    clean
      .replace(/[^a-zA-Z0-9]/g, "")
      .charAt(0)
      .toUpperCase() +
      clean
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(1)
        .toLowerCase(), // sin caracteres especiales title case
  ];

  // Remover duplicados manteniendo el orden
  return [...new Set(variations)];
}

export const POST: APIRoute = async ({ request }) => {
  console.log(
    "🎫 API validate-coupon iniciada - timestamp:",
    new Date().toISOString()
  );

  try {
    // 1. Verificar el body de la request
    const body = await request.text();
    console.log("📦 Body recibido (raw):", body);

    let parsedData;
    try {
      parsedData = JSON.parse(body);
      console.log("📦 Datos parseados:", parsedData);
    } catch (parseError) {
      console.error("❌ Error parseando JSON:", parseError);
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Datos inválidos",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { couponCode } = parsedData;

    // 2. Validar que llegue el código
    if (!couponCode || typeof couponCode !== "string") {
      console.error("❌ Código de cupón faltante o inválido:", {
        couponCode,
        type: typeof couponCode,
      });
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Código de cupón requerido",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Generar variaciones del código
    const codeVariations = normalizeCouponCode(couponCode);
    console.log("🔍 Intentando variaciones del código:", codeVariations);

    // 4. Verificar configuración de Stripe
    const stripeKey = import.meta.env.PUBLIC_STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error("❌ Falta STRIPE_SECRET_KEY");
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Error de configuración del servidor",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("🔐 Stripe configurado:", {
      keyExists: !!stripeKey,
      keyPrefix: stripeKey?.substring(0, 10),
    });

    // 5. Intentar cada variación hasta encontrar una que funcione
    for (const codeVariation of codeVariations) {
      try {
        console.log("🔄 Consultando Stripe para cupón:", codeVariation);
        const coupon = await stripe.coupons.retrieve(codeVariation);

        console.log("📋 Cupón encontrado:", {
          id: coupon.id,
          name: coupon.name,
          valid: coupon.valid,
          percent_off: coupon.percent_off,
          amount_off: coupon.amount_off,
          currency: coupon.currency,
          duration: coupon.duration,
          redeem_by: coupon.redeem_by,
          max_redemptions: coupon.max_redemptions,
          times_redeemed: coupon.times_redeemed,
        });

        // 6. Realizar todas las validaciones
        console.log("🔍 Iniciando validaciones...");

        // Validar si el cupón está activo
        if (!coupon.valid) {
          console.warn("⚠️ Cupón marcado como inválido en Stripe");
          return new Response(
            JSON.stringify({
              valid: false,
              error: "Este cupón ya no está disponible",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Validar fecha de expiración
        const currentTimestamp = Math.floor(Date.now() / 1000);
        console.log("📅 Validando fecha:", {
          current: currentTimestamp,
          currentDate: new Date().toISOString(),
          redeem_by: coupon.redeem_by,
          redeem_by_date: coupon.redeem_by
            ? new Date(coupon.redeem_by * 1000).toISOString()
            : "Sin límite",
          expired: coupon.redeem_by
            ? coupon.redeem_by < currentTimestamp
            : false,
        });

        if (coupon.redeem_by && coupon.redeem_by < currentTimestamp) {
          console.warn("⚠️ Cupón expirado");
          return new Response(
            JSON.stringify({
              valid: false,
              error: "Este cupón ha expirado",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Validar límite de usos
        console.log("📊 Validando límite de usos:", {
          max_redemptions: coupon.max_redemptions,
          times_redeemed: coupon.times_redeemed,
          hasLimit: !!coupon.max_redemptions,
          reachedLimit: coupon.max_redemptions
            ? coupon.times_redeemed >= coupon.max_redemptions
            : false,
        });

        if (
          coupon.max_redemptions &&
          coupon.times_redeemed >= coupon.max_redemptions
        ) {
          console.warn("⚠️ Cupón ha alcanzado el límite de usos");
          return new Response(
            JSON.stringify({
              valid: false,
              error: "Este cupón ha alcanzado su límite de usos",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Validar moneda para descuentos fijos
        console.log("💰 Validando moneda:", {
          amount_off: coupon.amount_off,
          currency: coupon.currency,
          needsEUR: !!coupon.amount_off,
          isEUR: coupon.currency === "eur",
        });

        if (coupon.amount_off && coupon.currency !== "eur") {
          console.warn("⚠️ Cupón no compatible con EUR");
          return new Response(
            JSON.stringify({
              valid: false,
              error: "Este cupón no es válido para tu moneda",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        console.log("✅ Todas las validaciones pasaron - Cupón válido");

        // 7. Retornar información del cupón válido
        const responseData = {
          valid: true,
          coupon: {
            id: coupon.id,
            name: coupon.name || coupon.id,
            percent_off: coupon.percent_off,
            amount_off: coupon.amount_off,
            currency: coupon.currency,
            duration: coupon.duration,
          },
        };

        console.log("📤 Enviando respuesta exitosa:", responseData);

        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (stripeError: any) {
        console.log(
          `❌ Variación ${codeVariation} no encontrada, probando siguiente...`
        );
        console.log("Detalles del error:", {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
        });
        continue; // Probar la siguiente variación
      }
    }

    // Si llegamos aquí, ninguna variación funcionó
    console.log("📝 Ninguna variación del cupón encontrada");
    return new Response(
      JSON.stringify({
        valid: false,
        error: "Código de cupón inválido",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error general completo en validate-coupon:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    return new Response(
      JSON.stringify({
        valid: false,
        error: "Error interno del servidor.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
