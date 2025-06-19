// src/pages/api/upload.ts
import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY // service_role desde .env
);

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No se envió ningún archivo" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validar que sea un PDF
    if (file.type !== "application/pdf") {
      return new Response(
        JSON.stringify({ error: "Solo se permiten archivos PDF" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validar tamaño (máx 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({
          error: "El archivo es demasiado grande. Máximo 10MB.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generar nombre único
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}-${randomStr}.${fileExtension}`;

    console.log("Subiendo archivo:", {
      originalName: file.name,
      fileName: fileName,
      size: file.size,
      type: file.type,
    });

    // Subir archivo a Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from("books")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Error de Supabase Storage:", error);
      return new Response(
        JSON.stringify({
          error: "Error subiendo archivo a Supabase",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Obtener la URL pública del archivo
    const { data: publicData } = supabaseAdmin.storage
      .from("books")
      .getPublicUrl(fileName);

    console.log("Archivo subido exitosamente:", {
      path: data.path,
      publicUrl: publicData.publicUrl,
    });

    // Devolver tanto el path como la URL pública
    return new Response(
      JSON.stringify({
        success: true,
        path: data.path, // Para guardar en la DB
        publicUrl: publicData.publicUrl, // Para mostrar/descargar
        fileName: fileName,
        originalName: file.name,
        size: file.size,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error general en upload:", error);
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
