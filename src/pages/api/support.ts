import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, message, userId } = await request.json();
    if (!email || !message) {
      return new Response(JSON.stringify({ error: "Faltan email o mensaje" }), {
        status: 400,
      });
    }
    const { error } = await supabaseAdmin
      .from("support_messages")
      .insert([{ email, message, user_id: userId }]);
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    console.error("Error en /api/support:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
