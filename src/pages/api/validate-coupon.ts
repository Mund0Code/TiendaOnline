// src/pages/api/validate-coupon.ts - Versión con mejor debugging
import type { APIRoute } from "astro";
import { Stripe } from "stripe";

const stripe = new Stripe(import.meta.env.PUBLIC_STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

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

    const cleanCode = couponCode.trim().toUpperCase();
    console.log("🔍 Validando cupón:", {
      original: couponCode,
      cleaned: cleanCode,
    });

    // 3. Verificar configuración de Stripe
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

    try {
      // 4. Intentar obtener el cupón de Stripe
      console.log("🔄 Consultando Stripe para cupón:", cleanCode);
      const coupon = await stripe.coupons.retrieve(cleanCode);

      console.log("📋 Cupón obtenido de Stripe:", {
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
        created: coupon.created,
        livemode: coupon.livemode,
      });

      // 5. Validaciones paso a paso
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
        expired: coupon.redeem_by ? coupon.redeem_by < currentTimestamp : false,
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

      // 6. Retornar información del cupón válido
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
      console.error("❌ Error de Stripe completo:", {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        statusCode: stripeError.statusCode,
        requestId: stripeError.requestId,
        stack: stripeError.stack,
      });

      // Manejar diferentes tipos de errores de Stripe
      if (stripeError.code === "resource_missing") {
        console.log("📝 Cupón no encontrado en Stripe");
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
      }

      if (stripeError.type === "StripeInvalidRequestError") {
        console.log("📝 Request inválido a Stripe");
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
      }

      if (stripeError.type === "StripeAuthenticationError") {
        console.log("📝 Error de autenticación con Stripe");
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

      // Error genérico de Stripe
      console.log("📝 Error genérico de Stripe");
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Error al validar el cupón",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    console.error("❌ Error general completo en validate-coupon:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    return new Response(
      JSON.stringify({
        valid: false,
        error: "Error interno del servidor",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
