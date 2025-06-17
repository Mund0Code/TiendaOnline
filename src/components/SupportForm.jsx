// src/components/SupportForm.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SupportForm() {
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user.id ?? null;
      const email = session?.user.email ?? "anonimo@desconocido";
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message: msg, userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error desconocido");
      setSent(true);
    } catch (e) {
      console.error("SupportForm error:", e);
      setError(e.message);
    }
  };

  if (sent) {
    return (
      <div className="mt-16">
        <p className="text-green-600">
          ¡Mensaje enviado! Te contactaremos pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-20">
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <h3 className="text-2xl font-semibold">Soporte</h3>
        {error && <p className="text-red-600">{error}</p>}
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          required
          placeholder="Cuéntanos tu problema..."
          className="w-full border rounded px-3 py-2 h-32"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
