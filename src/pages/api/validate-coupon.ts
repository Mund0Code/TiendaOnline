// src/pages/api/validate-coupon.ts
import type { APIRoute } from "astro";
import { Stripe } from "stripe";

const stripe = new Stripe(import.meta.env.PUBLIC_STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

export const POST: APIRoute = async ({ request }) => {
  console.log("🎫 API validate-coupon iniciada");

  try {
    const { couponCode } = await request.json();

    if (!couponCode || typeof couponCode !== "string") {
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

    console.log("🔍 Validando cupón:", couponCode);

    try {
      // Buscar el cupón en Stripe
      const coupon = await stripe.coupons.retrieve(couponCode);

      console.log("📋 Cupón encontrado:", {
        id: coupon.id,
        valid: coupon.valid,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
        currency: coupon.currency,
        duration: coupon.duration,
        redeem_by: coupon.redeem_by,
        max_redemptions: coupon.max_redemptions,
        times_redeemed: coupon.times_redeemed,
      });

      // Validar si el cupón está activo
      if (!coupon.valid) {
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
      if (
        coupon.redeem_by &&
        coupon.redeem_by < Math.floor(Date.now() / 1000)
      ) {
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
      if (
        coupon.max_redemptions &&
        coupon.times_redeemed >= coupon.max_redemptions
      ) {
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

      // Validar que sea aplicable a EUR si es descuento fijo
      if (coupon.amount_off && coupon.currency !== "eur") {
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

      console.log("✅ Cupón válido");

      // Retornar información del cupón
      return new Response(
        JSON.stringify({
          valid: true,
          coupon: {
            id: coupon.id,
            percent_off: coupon.percent_off,
            amount_off: coupon.amount_off,
            currency: coupon.currency,
            duration: coupon.duration,
            name: coupon.name,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (stripeError: any) {
      console.error("❌ Error de Stripe:", stripeError);

      // Si el cupón no existe
      if (stripeError.code === "resource_missing") {
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

      // Otros errores de Stripe
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
    console.error("❌ Error general en validate-coupon:", error);

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
