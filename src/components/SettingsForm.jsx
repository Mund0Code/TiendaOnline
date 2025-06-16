// src/components/SettingsForm.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SettingsForm() {
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState({ name: "", email: "", pass: "" });
  const [loading, setLoading] = useState({
    name: false,
    email: false,
    pass: false,
  });

  // Carga inicial de usuario y perfil
  useEffect(() => {
    (async () => {
      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession();
      if (sessErr || !session) {
        window.location.href = "/login";
        return;
      }

      const user = session.user;
      setUserId(user.id);
      setEmail(user.email);

      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profErr) return console.error(profErr);
      setFullName(profile.full_name || "");
    })();
  }, []);

  // Actualiza sólo el nombre
  const updateName = async (e) => {
    e.preventDefault();
    setMsg((m) => ({ ...m, name: "" }));
    setLoading((l) => ({ ...l, name: true }));
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", userId);
      if (error) throw error;

      setMsg((m) => ({ ...m, name: "✅ Nombre actualizado" }));
    } catch (err) {
      setMsg((m) => ({ ...m, name: `❌ ${err.message}` }));
    } finally {
      setLoading((l) => ({ ...l, name: false }));
    }
  };

  // Actualiza sólo el email
  const updateEmail = async (e) => {
    e.preventDefault();
    setMsg((m) => ({ ...m, email: "" }));
    setLoading((l) => ({ ...l, email: true }));
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;

      setMsg((m) => ({ ...m, email: "✅ Email actualizado" }));
    } catch (err) {
      setMsg((m) => ({ ...m, email: `❌ ${err.message}` }));
    } finally {
      setLoading((l) => ({ ...l, email: false }));
    }
  };

  // Actualiza sólo la contraseña
  const updatePassword = async (e) => {
    e.preventDefault();
    setMsg((m) => ({ ...m, pass: "" }));
    setLoading((l) => ({ ...l, pass: true }));
    try {
      if (!password) throw new Error("Introduce una nueva contraseña");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMsg((m) => ({ ...m, pass: "✅ Contraseña actualizada" }));
      setPassword("");
    } catch (err) {
      setMsg((m) => ({ ...m, pass: `❌ ${err.message}` }));
    } finally {
      setLoading((l) => ({ ...l, pass: false }));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 space-y-8 p-6">
      {/* Nombre */}
      <form
        onSubmit={updateName}
        className="bg-white p-4 rounded shadow space-y-2"
      >
        <h3 className="font-semibold">Nombre completo</h3>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading.name}
          className={`px-4 py-2 rounded text-white ${
            loading.name ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading.name ? "..." : "Actualizar nombre"}
        </button>
        {msg.name && <p className="text-sm">{msg.name}</p>}
      </form>

      {/* Email */}
      <form
        onSubmit={updateEmail}
        className="bg-white p-4 rounded shadow space-y-2"
      >
        <h3 className="font-semibold">Email</h3>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading.email}
          className={`px-4 py-2 rounded text-white ${
            loading.email ? "bg-gray-400" : "bg-yellow-600 hover:bg-yellow-700"
          }`}
        >
          {loading.email ? "..." : "Actualizar email"}
        </button>
        {msg.email && <p className="text-sm">{msg.email}</p>}
      </form>

      {/* Contraseña */}
      <form
        onSubmit={updatePassword}
        className="bg-white p-4 rounded shadow space-y-2"
      >
        <h3 className="font-semibold">Contraseña</h3>
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading.pass}
          className={`px-4 py-2 rounded text-white ${
            loading.pass ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading.pass ? "..." : "Actualizar contraseña"}
        </button>
        {msg.pass && <p className="text-sm">{msg.pass}</p>}
      </form>
    </div>
  );
}
