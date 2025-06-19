import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const POST: APIRoute = async ({ request }) => {
  try {
    const {
      email,
      message,
      userId,
      subject,
      category,
      priority,
      userAgent,
      timestamp,
    } = await request.json();

    // Validaciones básicas
    if (!email || !message) {
      return new Response(JSON.stringify({ error: "Faltan email o mensaje" }), {
        status: 400,
      });
    }

    // Validaciones adicionales para los nuevos campos
    if (!subject || subject.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "El asunto es obligatorio" }),
        { status: 400 }
      );
    }

    if (!category) {
      return new Response(
        JSON.stringify({ error: "La categoría es obligatoria" }),
        { status: 400 }
      );
    }

    if (message.trim().length < 10) {
      return new Response(
        JSON.stringify({
          error: "El mensaje debe tener al menos 10 caracteres",
        }),
        { status: 400 }
      );
    }

    // Validar categoría
    const validCategories = [
      "technical",
      "billing",
      "account",
      "download",
      "general",
      "other",
    ];
    if (!validCategories.includes(category)) {
      return new Response(JSON.stringify({ error: "Categoría no válida" }), {
        status: 400,
      });
    }

    // Validar prioridad
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (priority && !validPriorities.includes(priority)) {
      return new Response(JSON.stringify({ error: "Prioridad no válida" }), {
        status: 400,
      });
    }

    // Preparar datos para insertar
    const supportData = {
      email: email.trim(),
      user_id: userId || null,
      subject: subject.trim(),
      category,
      priority: priority || "medium",
      message: message.trim(),
      user_agent: userAgent || null,
      timestamp: timestamp || new Date().toISOString(),
      status: "pending",
    };

    // Insertar en la base de datos
    const { data, error } = await supabaseAdmin
      .from("support_messages")
      .insert([supportData])
      .select("id, created_at");

    if (error) {
      console.error("Error insertando mensaje de soporte:", error);
      throw error;
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        message: "Mensaje de soporte enviado correctamente",
        id: data[0]?.id,
        created_at: data[0]?.created_at,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e: any) {
    console.error("Error en /api/support:", e);
    return new Response(
      JSON.stringify({
        error: e.message || "Error interno del servidor",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
