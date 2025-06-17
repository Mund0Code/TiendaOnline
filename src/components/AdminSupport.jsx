// src/components/AdminSupport.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminSupport() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_messages")
      .select("id, email, message, status, created_at")
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

  if (loading) return <p>Cargando mensajes de soporte…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;
  if (!messages.length) return <p>No hay mensajes de soporte.</p>;

  return (
    <div className="space-y-4 mt-10">
      <h2 className="text-2xl font-semibold">Mensajes de Soporte</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead className="bg-gray-100">
            <tr>
              {["Email", "Mensaje", "Fecha", "Estado", "Acciones"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-sm font-medium text-gray-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-2 text-sm">{m.email}</td>
                <td className="px-4 py-2">{m.message}</td>
                <td className="px-4 py-2 text-sm">
                  {new Date(m.created_at).toLocaleString("es-ES", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2">
                  <select
                    value={m.status}
                    onChange={(e) => handleStatusChange(m.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="read">Leído</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
