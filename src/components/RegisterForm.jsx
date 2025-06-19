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
      // 1) Verificar si el email ya está registrado
      const { data: existingUser } = await supabase.auth.getUser();

      // 2) Registro en Auth
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
        // Manejar diferentes tipos de errores de auth
        if (signUpError.message.includes("already registered")) {
          setError("Este email ya está registrado. ¿Quieres iniciar sesión?");
        } else if (signUpError.message.includes("Password")) {
          setError("La contraseña no cumple con los requisitos de seguridad");
        } else if (signUpError.message.includes("email")) {
          setError("El formato del email no es válido");
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

      console.log("Usuario creado:", user.id);

      // 3) Verificar si ya existe un perfil (puede haberse creado automáticamente)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (existingProfile) {
        console.log("Perfil ya existe, actualizando...");

        // Si ya existe, actualizar
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            full_name: form.name.trim(),
            email: user.email,
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("Error actualizando perfil:", updateError);
          setError("Error al actualizar perfil: " + updateError.message);
          setLoading(false);
          return;
        }
      } else {
        console.log("Creando nuevo perfil...");

        // Si no existe, crear nuevo perfil usando UPSERT para mayor seguridad
        const { error: profileError } = await supabase.from("profiles").upsert(
          [
            {
              id: user.id,
              full_name: form.name.trim(),
              email: user.email,
              created_at: new Date().toISOString(),
            },
          ],
          {
            onConflict: "id",
          }
        );

        if (profileError) {
          console.error("Error creando perfil:", profileError);
          setError("Error al crear perfil: " + profileError.message);
          setLoading(false);
          return;
        }
      }

      // 4) Éxito
      console.log("Registro completado exitosamente");

      if (signUpData.user && !signUpData.user.email_confirmed_at) {
        setSuccess(
          "¡Registro exitoso! Revisa tu email para confirmar tu cuenta antes de iniciar sesión."
        );

        // Limpiar formulario
        setForm({ name: "", email: "", password: "" });

        // Redirigir después de un delay para que puedan leer el mensaje
        setTimeout(() => {
          window.location.href = "/login";
        }, 3000);
      } else {
        setSuccess("¡Registro exitoso! Redirigiendo...");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
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
                    className="h-5 w-5 text-red-600"
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
                    className="h-5 w-5 text-green-600"
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
