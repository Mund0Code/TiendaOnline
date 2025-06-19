// src/components/SupportForm.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SupportForm() {
  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    priority: "medium",
    message: "",
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [charCount, setCharCount] = useState(0);

  // Obtener información del usuario
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    })();
  }, []);

  // Categorías de soporte
  const categories = [
    { value: "", label: "Seleccionar categoría" },
    {
      value: "technical",
      label: "🔧 Problema técnico",
      description: "Errores, bugs, problemas de funcionamiento",
    },
    {
      value: "billing",
      label: "💳 Facturación",
      description: "Pagos, facturas, reembolsos",
    },
    {
      value: "account",
      label: "👤 Mi cuenta",
      description: "Configuración, acceso, perfil",
    },
    {
      value: "download",
      label: "📥 Descarga de productos",
      description: "Problemas para descargar archivos",
    },
    {
      value: "general",
      label: "💬 Consulta general",
      description: "Preguntas generales o sugerencias",
    },
    { value: "other", label: "🤔 Otro", description: "Cualquier otro tema" },
  ];

  // Niveles de prioridad
  const priorities = [
    {
      value: "low",
      label: "Baja",
      color: "bg-green-100 text-green-800",
      description: "No es urgente",
    },
    {
      value: "medium",
      label: "Media",
      color: "bg-yellow-100 text-yellow-800",
      description: "Importancia normal",
    },
    {
      value: "high",
      label: "Alta",
      color: "bg-orange-100 text-orange-800",
      description: "Necesita atención pronto",
    },
    {
      value: "urgent",
      label: "Urgente",
      color: "bg-red-100 text-red-800",
      description: "Requiere atención inmediata",
    },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "message") {
      setCharCount(value.length);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validaciones
    if (!formData.subject.trim()) {
      setError("El asunto es obligatorio");
      setLoading(false);
      return;
    }

    if (!formData.category) {
      setError("Por favor selecciona una categoría");
      setLoading(false);
      return;
    }

    if (!formData.message.trim()) {
      setError("El mensaje es obligatorio");
      setLoading(false);
      return;
    }

    if (formData.message.length < 10) {
      setError("El mensaje debe tener al menos 10 caracteres");
      setLoading(false);
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user.id ?? null;
      const email = session?.user.email ?? "anonimo@desconocido";

      const supportData = {
        email,
        userId,
        subject: formData.subject.trim(),
        category: formData.category,
        priority: formData.priority,
        message: formData.message.trim(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };

      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supportData),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error desconocido");
      }

      setSent(true);

      // Reset form
      setFormData({
        subject: "",
        category: "",
        priority: "medium",
        message: "",
      });
      setCharCount(0);
    } catch (e) {
      console.error("SupportForm error:", e);
      setError(`Error al enviar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSent(false);
    setError("");
    setFormData({
      subject: "",
      category: "",
      priority: "medium",
      message: "",
    });
    setCharCount(0);
  };

  // Estado de éxito
  if (sent) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
            <h2 className="text-2xl font-bold text-white">Soporte técnico</h2>
          </div>

          <div className="p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg
                className="h-8 w-8 text-green-600"
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
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Mensaje enviado correctamente!
            </h3>
            <p className="text-gray-600 mb-6">
              Hemos recibido tu consulta y nuestro equipo de soporte se pondrá
              en contacto contigo lo antes posible.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <svg
                  className="h-5 w-5 text-blue-600 mt-0.5"
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
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Tiempo de respuesta estimado:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• Consultas generales: 24-48 horas</li>
                    <li>• Problemas técnicos: 12-24 horas</li>
                    <li>• Urgencias: 2-6 horas</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Enviar otro mensaje
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Volver al dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Centro de soporte
              </h2>
              <p className="text-blue-100">
                ¿Necesitas ayuda? Estamos aquí para ti
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Info del usuario */}
          {user && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-semibold">
                    {(user.user_metadata?.full_name || user.email)
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {user.user_metadata?.full_name || "Usuario"}
                  </p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error message */}
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
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asunto */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asunto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  placeholder="Describe brevemente tu problema..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.subject.length}/100 caracteres
                </p>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    handleInputChange("category", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {formData.category && (
                  <p className="text-xs text-gray-500 mt-1">
                    {
                      categories.find((c) => c.value === formData.category)
                        ?.description
                    }
                  </p>
                )}
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad
                </label>
                <div className="space-y-2">
                  {priorities.map((priority) => (
                    <label
                      key={priority.value}
                      className="flex items-center space-x-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={priority.value}
                        checked={formData.priority === priority.value}
                        onChange={(e) =>
                          handleInputChange("priority", e.target.value)
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${priority.color}`}
                      >
                        {priority.label}
                      </span>
                      <span className="text-sm text-gray-600">
                        {priority.description}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Mensaje */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción detallada <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => handleInputChange("message", e.target.value)}
                placeholder="Describe tu problema con el mayor detalle posible. Incluye pasos para reproducir el error, capturas de pantalla relevantes, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                rows={6}
                maxLength={2000}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  Mínimo 10 caracteres para una descripción útil
                </p>
                <p
                  className={`text-xs ${charCount > 1800 ? "text-red-500" : "text-gray-500"}`}
                >
                  {charCount}/2000 caracteres
                </p>
              </div>
            </div>

            {/* Consejos */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg
                  className="h-5 w-5 text-blue-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">
                    💡 Consejos para obtener mejor ayuda:
                  </p>
                  <ul className="space-y-1 text-blue-700">
                    <li>
                      • Incluye capturas de pantalla si es un error visual
                    </li>
                    <li>• Menciona qué navegador y dispositivo usas</li>
                    <li>• Describe los pasos exactos que siguiste</li>
                    <li>
                      • Si es un problema de facturación, incluye el ID de la
                      transacción
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botón de envío */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Limpiar formulario
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  !formData.subject.trim() ||
                  !formData.category ||
                  !formData.message.trim()
                }
                className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                  loading ||
                  !formData.subject.trim() ||
                  !formData.category ||
                  !formData.message.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                }`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Enviando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    <span>Enviar mensaje</span>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
