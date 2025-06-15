// src/pages/api/list-files.ts
import { createClient } from "@supabase/supabase-js";
import type { APIRoute } from "astro";

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

// Ajusta aquí el nombre real de tu bucket (tal cual aparece en el Panel Storage)
const BUCKET = "books"; // o 'books', según lo tengas

export const GET: APIRoute = async () => {
  const { data, error } = await supabase.storage.from(BUCKET).list("", {
    limit: 100,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
  return new Response(JSON.stringify({ files: data }), {
    headers: { "Content-Type": "application/json" },
  });
};
