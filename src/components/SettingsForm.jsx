// src/components/SettingsForm.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SettingsForm() {
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentEmail, setCurrentEmail] = useState(""); // Para comparar cambios
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState({
    name: "",
    email: "",
    pass: "",
    general: "",
  });
  const [loading, setLoading] = useState({
    name: false,
    email: false,
    pass: false,
    profile: true,
  });

  const [showPasswords, setShowPasswords] = useState(false);
  const [hasChanges, setHasChanges] = useState({
    name: false,
    email: false,
  });

  // Carga inicial de usuario y perfil
  useEffect(() => {
    (async () => {
      try {
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
        setCurrentEmail(user.email);

        // Intentar obtener perfil, crear uno si no existe
        let { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (profErr && profErr.code === "PGRST116") {
          // Perfil no existe, crearlo
          const { data: newProfile, error: createErr } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || "",
              email: user.email,
            })
            .select()
            .single();

          if (createErr) {
            console.error("Error creando perfil:", createErr);
            setMsg((m) => ({ ...m, general: "❌ Error cargando perfil" }));
          } else {
            profile = newProfile;
          }
        } else if (profErr) {
          console.error("Error obteniendo perfil:", profErr);
          setMsg((m) => ({ ...m, general: "❌ Error cargando perfil" }));
        }

        if (profile) {
          setFullName(profile.full_name || "");
        }
      } catch (err) {
        console.error("Error en carga inicial:", err);
        setMsg((m) => ({ ...m, general: "❌ Error cargando datos" }));
      } finally {
        setLoading((l) => ({ ...l, profile: false }));
      }
    })();
  }, []);

  // Detectar cambios
  useEffect(() => {
    setHasChanges({
      name: fullName !== (fullName || ""),
      email: email !== currentEmail,
    });
  }, [fullName, email, currentEmail]);

  // Limpiar mensajes después de unos segundos
  useEffect(() => {
    const clearMessages = () => {
      Object.keys(msg).forEach((key) => {
        if (msg[key] && msg[key].startsWith("✅")) {
          setTimeout(() => {
            setMsg((m) => ({ ...m, [key]: "" }));
          }, 3000);
        }
      });
    };
    clearMessages();
  }, [msg]);

  // Validar contraseña
  const validatePassword = (pass) => {
    if (pass.length < 6)
      return "La contraseña debe tener al menos 6 caracteres";
    if (!/(?=.*[a-z])/.test(pass))
      return "Debe contener al menos una minúscula";
    if (!/(?=.*[A-Z])/.test(pass))
      return "Debe contener al menos una mayúscula";
    if (!/(?=.*\d)/.test(pass)) return "Debe contener al menos un número";
    return null;
  };

  // Actualiza nombre
  const updateName = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setMsg((m) => ({ ...m, name: "❌ El nombre no puede estar vacío" }));
      return;
    }

    setMsg((m) => ({ ...m, name: "" }));
    setLoading((l) => ({ ...l, name: true }));

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName.trim(),
        email: currentEmail,
      });

      if (error) throw error;

      // Actualizar también en auth metadata
      await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      setMsg((m) => ({ ...m, name: "✅ Nombre actualizado correctamente" }));
    } catch (err) {
      console.error("Error actualizando nombre:", err);
      setMsg((m) => ({ ...m, name: `❌ ${err.message}` }));
    } finally {
      setLoading((l) => ({ ...l, name: false }));
    }
  };

  // Actualiza email
  const updateEmail = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setMsg((m) => ({ ...m, email: "❌ Email inválido" }));
      return;
    }

    if (email === currentEmail) {
      setMsg((m) => ({ ...m, email: "❌ El email es el mismo que el actual" }));
      return;
    }

    setMsg((m) => ({ ...m, email: "" }));
    setLoading((l) => ({ ...l, email: true }));

    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;

      setMsg((m) => ({
        ...m,
        email:
          "✅ Email actualizado. Revisa tu bandeja de entrada para confirmar.",
      }));
      setCurrentEmail(email);
    } catch (err) {
      console.error("Error actualizando email:", err);
      setMsg((m) => ({ ...m, email: `❌ ${err.message}` }));
    } finally {
      setLoading((l) => ({ ...l, email: false }));
    }
  };

  // Actualiza contraseña
  const updatePassword = async (e) => {
    e.preventDefault();

    if (!password) {
      setMsg((m) => ({ ...m, pass: "❌ Introduce una nueva contraseña" }));
      return;
    }

    if (password !== confirmPassword) {
      setMsg((m) => ({ ...m, pass: "❌ Las contraseñas no coinciden" }));
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setMsg((m) => ({ ...m, pass: `❌ ${passwordError}` }));
      return;
    }

    setMsg((m) => ({ ...m, pass: "" }));
    setLoading((l) => ({ ...l, pass: true }));

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMsg((m) => ({
        ...m,
        pass: "✅ Contraseña actualizada correctamente",
      }));
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Error actualizando contraseña:", err);
      setMsg((m) => ({ ...m, pass: `❌ ${err.message}` }));
    } finally {
      setLoading((l) => ({ ...l, pass: false }));
    }
  };

  // Cerrar sesión
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/login";
    } catch (err) {
      console.error("Error cerrando sesión:", err);
      setMsg((m) => ({ ...m, general: "❌ Error cerrando sesión" }));
    }
  };

  if (loading.profile) {
    return (
      <div className="mt-24 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="mt-24 mx-auto max-w-6xl px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Configuración de cuenta
        </h2>
        <p className="mt-2 text-gray-600">
          Gestiona tu información personal y preferencias
        </p>
      </div>

      {msg.general && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-red-700">{msg.general}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Información Personal */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">
              Información Personal
            </h3>
          </div>

          <form onSubmit={updateName} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tu nombre completo"
              />
            </div>

            <button
              type="submit"
              disabled={loading.name || !fullName.trim()}
              className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                loading.name || !fullName.trim()
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              }`}
            >
              {loading.name ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Actualizando...
                </div>
              ) : (
                "Actualizar nombre"
              )}
            </button>

            {msg.name && (
              <div
                className={`text-sm p-2 rounded ${
                  msg.name.startsWith("✅")
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {msg.name}
              </div>
            )}
          </form>
        </div>

        {/* Email */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">Email</h3>
          </div>

          <form onSubmit={updateEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección de email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="tu@email.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                Se enviará un email de confirmación al nuevo email
              </p>
            </div>

            <button
              type="submit"
              disabled={loading.email || email === currentEmail}
              className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                loading.email || email === currentEmail
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-yellow-600 text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              }`}
            >
              {loading.email ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Actualizando...
                </div>
              ) : (
                "Actualizar email"
              )}
            </button>

            {msg.email && (
              <div
                className={`text-sm p-2 rounded ${
                  msg.email.startsWith("✅")
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {msg.email}
              </div>
            )}
          </form>
        </div>

        {/* Contraseña */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">
              Contraseña
            </h3>
          </div>

          <form onSubmit={updatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nueva contraseña"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Confirmar contraseña"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showPasswords"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label
                htmlFor="showPasswords"
                className="ml-2 text-sm text-gray-700"
              >
                Mostrar contraseñas
              </label>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>La contraseña debe tener:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Al menos 6 caracteres</li>
                <li>Una letra minúscula</li>
                <li>Una letra mayúscula</li>
                <li>Un número</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading.pass || !password || !confirmPassword}
              className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                loading.pass || !password || !confirmPassword
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              }`}
            >
              {loading.pass ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Actualizando...
                </div>
              ) : (
                "Actualizar contraseña"
              )}
            </button>

            {msg.pass && (
              <div
                className={`text-sm p-2 rounded ${
                  msg.pass.startsWith("✅")
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {msg.pass}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Sección de acciones peligrosas */}
      <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-4">
          Zona de peligro
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-red-700 font-medium">Cerrar sesión</p>
            <p className="text-red-600 text-sm">
              Cerrar sesión en este dispositivo
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 sm:mt-0 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
