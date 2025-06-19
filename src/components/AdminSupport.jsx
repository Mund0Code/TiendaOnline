// src/components/AdminSupport.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminSupport() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_messages")
      .select(
        "id, email, subject, category, priority, message, status, created_at, user_agent"
      )
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error cargando soporte:", error);
      setError(error.message);
    } else {
      setMessages(data);
      setError("");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from("support_messages")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      console.error("Error actualizando estado:", error);
      alert("No se pudo actualizar el estado.");
    } else {
      fetchMessages();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este mensaje de soporte?")) return;
    const { error } = await supabase
      .from("support_messages")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Error eliminando mensaje:", error);
      alert("No se pudo eliminar.");
    } else {
      fetchMessages();
    }
  };

  // Funciones de utilidad para badges y filtros
  const getCategoryInfo = (category) => {
    const categories = {
      technical: {
        label: "🔧 Técnico",
        color: "bg-red-100 text-red-800 border-red-200",
      },
      billing: {
        label: "💳 Facturación",
        color: "bg-green-100 text-green-800 border-green-200",
      },
      account: {
        label: "👤 Cuenta",
        color: "bg-blue-100 text-blue-800 border-blue-200",
      },
      download: {
        label: "📥 Descarga",
        color: "bg-purple-100 text-purple-800 border-purple-200",
      },
      general: {
        label: "💬 General",
        color: "bg-gray-100 text-gray-800 border-gray-200",
      },
      other: {
        label: "🤔 Otro",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
    };
    return (
      categories[category] || {
        label: category,
        color: "bg-gray-100 text-gray-800 border-gray-200",
      }
    );
  };

  const getPriorityInfo = (priority) => {
    const priorities = {
      low: {
        label: "Baja",
        color: "bg-green-100 text-green-800 border-green-200",
      },
      medium: {
        label: "Media",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      high: {
        label: "Alta",
        color: "bg-orange-100 text-orange-800 border-orange-200",
      },
      urgent: {
        label: "Urgente",
        color: "bg-red-100 text-red-800 border-red-200",
      },
    };
    return (
      priorities[priority] || {
        label: priority,
        color: "bg-gray-100 text-gray-800 border-gray-200",
      }
    );
  };

  const getStatusInfo = (status) => {
    const statuses = {
      pending: {
        label: "Pendiente",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      read: {
        label: "Leído",
        color: "bg-blue-100 text-blue-800 border-blue-200",
      },
      in_progress: {
        label: "En progreso",
        color: "bg-purple-100 text-purple-800 border-purple-200",
      },
      resolved: {
        label: "Resuelto",
        color: "bg-green-100 text-green-800 border-green-200",
      },
      closed: {
        label: "Cerrado",
        color: "bg-gray-100 text-gray-800 border-gray-200",
      },
    };
    return (
      statuses[status] || {
        label: status,
        color: "bg-gray-100 text-gray-800 border-gray-200",
      }
    );
  };

  // Filtrar mensajes
  const filteredMessages = messages.filter((message) => {
    const matchesCategory =
      filterCategory === "all" || message.category === filterCategory;
    const matchesPriority =
      filterPriority === "all" || message.priority === filterPriority;
    const matchesStatus =
      filterStatus === "all" || message.status === filterStatus;
    return matchesCategory && matchesPriority && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 font-medium">
            Cargando mensajes de soporte…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error al cargar los datos
            </h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No hay mensajes de soporte
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Cuando los usuarios envíen mensajes de soporte, aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Mensajes de Soporte
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Gestiona y responde a los mensajes de tus usuarios
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {filteredMessages.length} de {messages.length} mensaje
            {messages.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={fetchMessages}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">Todas las categorías</option>
              <option value="technical">🔧 Técnico</option>
              <option value="billing">💳 Facturación</option>
              <option value="account">👤 Cuenta</option>
              <option value="download">📥 Descarga</option>
              <option value="general">💬 General</option>
              <option value="other">🤔 Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prioridad
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">Todas las prioridades</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="read">Leído</option>
              <option value="in_progress">En progreso</option>
              <option value="resolved">Resuelto</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla mejorada */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { key: "user", label: "Usuario" },
                  { key: "subject", label: "Asunto" },
                  { key: "category", label: "Categoría" },
                  { key: "priority", label: "Prioridad" },
                  { key: "message", label: "Mensaje" },
                  { key: "date", label: "Fecha" },
                  { key: "status", label: "Estado" },
                  { key: "actions", label: "Acciones" },
                ].map((header) => (
                  <th
                    key={header.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMessages.map((message, index) => {
                const categoryInfo = getCategoryInfo(message.category);
                const priorityInfo = getPriorityInfo(message.priority);
                const statusInfo = getStatusInfo(message.status);

                return (
                  <tr
                    key={message.id}
                    className={`hover:bg-gray-50 transition-colors duration-150 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-25"
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                              {message.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {message.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 max-w-xs">
                        <p className="line-clamp-1">
                          {message.subject || "Sin asunto"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${categoryInfo.color}`}
                      >
                        {categoryInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${priorityInfo.color}`}
                      >
                        {priorityInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        <p className="line-clamp-2 leading-relaxed">
                          {message.message}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {new Date(message.created_at).toLocaleDateString(
                            "es-ES",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(message.created_at).toLocaleTimeString(
                            "es-ES",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={message.status}
                        onChange={(e) =>
                          handleStatusChange(message.id, e.target.value)
                        }
                        className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors duration-200"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="read">Leído</option>
                        <option value="in_progress">En progreso</option>
                        <option value="resolved">Resuelto</option>
                        <option value="closed">Cerrado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleDelete(message.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
