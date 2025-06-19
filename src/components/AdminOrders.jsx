// src/components/AdminOrders.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("orders")
          .select("id, name, customer_email, amount_total, status, created_at")
          .order("created_at", { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setOrders(data || []);
      } catch (err) {
        console.error("Error cargando pedidos:", err);
        setError(err.message ?? "Error desconocido");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="p-6 text-center">Cargando pedidos…</p>;
  }

  if (error) {
    return (
      <p className="p-6 text-center text-red-600">
        Error al cargar pedidos: {error}
      </p>
    );
  }

  if (orders.length === 0) {
    return <p className="p-6 text-center">No hay pedidos.</p>;
  }

  return (
    <div className="space-y-4 mt-10">
      <h2 className="text-2xl font-semibold">Pedidos recientes</h2>
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["ID", "Producto", "Cliente", "Total", "Estado", "Fecha"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-sm font-medium text-gray-500"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-2 text-sm">{o.id.slice(0, 8)}…</td>
                <td className="px-4 py-2 text-sm">{o.name}</td>
                <td className="px-4 py-2 text-sm">{o.customer_email}</td>
                <td className="px-4 py-2 text-sm">
                  €{Number(o.amount_total).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-sm capitalize">{o.status}</td>
                <td className="px-4 py-2 text-sm">
                  {new Date(o.created_at).toLocaleString("es-ES")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
