// src/components/RegisterForm.jsx

import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1) Registro en Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.name }, // Guarda también el nombre en metadata
        },
      }
    );

    if (signUpError) {
      setError("Error en autenticación: " + signUpError.message);
      setLoading(false);
      return;
    }

    // ⚠️ Si tienes activado "email confirmation", `signUpData.user` será null
    const user = signUpData.user;
    if (!user) {
      setError("Revisa tu email para confirmar la cuenta.");
      setLoading(false);
      return;
    }

    // 3) Redirige al login
    window.location.href = "/login";
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6 p-4">
      <h2 className="text-2xl font-bold text-center">Crear cuenta</h2>

      {error && (
        <div className="bg-red-100 text-red-800 p-3 rounded">{error}</div>
      )}

      <div>
        <label htmlFor="name" className="block mb-1 font-medium">
          Nombre completo
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Tu nombre completo"
        />
      </div>

      <div>
        <label htmlFor="email" className="block mb-1 font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="usuario@ejemplo.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block mb-1 font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full text-white font-semibold px-4 py-2 rounded ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Registrando..." : "Registrarse"}
      </button>
    </form>
  );
}
