// src/pages/api/download.ts
import { createClient } from "@supabase/supabase-js";
import type { APIRoute } from "astro";

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

// Cambia esto al nombre real de tu bucket en Supabase Storage:
const BUCKET = "books"; // o 'books'

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const filePath = url.searchParams.get("file_path") || "";

  if (!filePath) {
    return new Response(JSON.stringify({ error: "file_path es obligatorio" }), {
      status: 400,
    });
  }

  // filePath debe ser la ruta DENTRO del bucket, sin prefijo
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600);

  if (error) {
    console.error("Download API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ url: data.signedUrl }), {
    headers: { "Content-Type": "application/json" },
  });
};
