// src/components/AdminUsers.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("id, full_name, email, is_admin, created_at") // <-- usa "name" en lugar de "full_name"
          .order("created_at", { ascending: false });

        if (fetchError) {
          throw fetchError;
        }
        setUsers(data);
      } catch (err) {
        console.error("Error cargando usuarios:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="p-6 text-center">Cargando usuarios…</p>;
  }
  if (error) {
    return (
      <p className="p-6 text-center text-red-600">
        Error al cargar usuarios: {error}
      </p>
    );
  }
  if (users.length === 0) {
    return <p className="p-6 text-center">No hay usuarios registrados.</p>;
  }

  return (
    <div className="space-y-4 mt-10">
      <h2 className="text-2xl font-semibold">Clientes</h2>
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                Nombre
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                Email
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                Rol
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                Fecha registro
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                  {u.full_name || "—"}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                  {u.email}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {u.is_admin ? (
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      Admin
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      Cliente
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {new Date(u.created_at).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
