// src/components/RegisterForm.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validateForm = () => {
    if (!form.name.trim()) {
      setError("El nombre es obligatorio");
      return false;
    }
    if (form.name.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return false;
    }
    if (!form.email.trim()) {
      setError("El email es obligatorio");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Por favor ingresa un email válido");
      return false;
    }
    if (!form.password) {
      setError("La contraseña es obligatoria");
      return false;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      console.log("🚀 Iniciando registro para:", form.email);

      // ✅ SOLO registro en Auth - el trigger se encarga del perfil
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          options: {
            data: {
              full_name: form.name.trim(),
            },
          },
        });

      if (signUpError) {
        console.error("❌ Error en signUp:", signUpError);

        if (signUpError.message.includes("already registered")) {
          setError("Este email ya está registrado. ¿Quieres iniciar sesión?");
        } else if (signUpError.message.includes("Password")) {
          setError("La contraseña no cumple con los requisitos de seguridad");
        } else if (signUpError.message.includes("email")) {
          setError("El formato del email no es válido");
        } else if (signUpError.message.includes("Database error")) {
          setError(
            "Error en la base de datos. El perfil se creará automáticamente al confirmar tu email."
          );
        } else {
          setError("Error en el registro: " + signUpError.message);
        }
        setLoading(false);
        return;
      }

      const user = signUpData.user;
      if (!user) {
        setError("Error inesperado en el registro");
        setLoading(false);
        return;
      }

      console.log("✅ Usuario creado exitosamente:", user.id);

      // ✅ ELIMINADO: Ya no intentamos crear el perfil manualmente
      // El trigger handle_new_user() se encarga de esto automáticamente

      // ✅ Éxito inmediato
      if (user && !user.email_confirmed_at) {
        setSuccess(
          "¡Registro exitoso! Revisa tu email para confirmar tu cuenta. Tu perfil se completará automáticamente."
        );

        console.log("📧 Email de confirmación enviado");

        // Limpiar formulario
        setForm({ name: "", email: "", password: "" });

        // Redirigir después de un delay
        setTimeout(() => {
          window.location.href = "/login?message=confirm-email";
        }, 4000);
      } else {
        // Usuario confirmado inmediatamente (unlikely but possible)
        setSuccess("¡Registro exitoso! Redirigiendo...");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      }
    } catch (err) {
      console.error("❌ Error inesperado en registro:", err);
      setError("Error inesperado. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
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
            <h2 className="text-3xl font-bold text-gray-900">Crear cuenta</h2>
            <p className="text-gray-600 mt-2">Únete y empieza tu experiencia</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mensajes */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg
                    className="h-5 w-5 text-red-600 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg
                    className="h-5 w-5 text-green-600 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-green-700 text-sm font-medium">
                    {success}
                  </p>
                </div>
              </div>
            )}

            {/* Nombre completo */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="Tu nombre completo"
                maxLength={100}
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="usuario@ejemplo.com"
                maxLength={255}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Contraseña <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
            </div>

            {/* Información sobre RLS */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <svg
                  className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-blue-700 text-xs">
                  Tu perfil se completará automáticamente al confirmar tu email.
                  Si tienes problemas, contacta con soporte.
                </p>
              </div>
            </div>

            {/* Botón de registro */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                loading
                  ? "bg-gray-400 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Registrando...</span>
                </div>
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>

          {/* Link para login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{" "}
              <a
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Inicia sesión aquí
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
