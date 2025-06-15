import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import SettingsForm from "./SettingsForm.jsx"; // tu formulario de Settings
import UserOrders from "./UserOrders.jsx"; // listado de pedidos

export default function ProfileDashboard() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");
  const tabs = [
    { key: "summary", label: "Resumen" },
    { key: "orders", label: "Pedidos" },
    { key: "settings", label: "Configuración" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = "/login";
      } else {
        const { user } = data.session;
        setUser(user);
        // Leemos el nombre guardado en user_metadata.full_name
        const fullName =
          user.user_metadata?.full_name || user.email || "Usuario";
        setName(fullName);
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return <p className="p-6 text-center">Comprobando sesión…</p>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar */}
      <nav className="w-full lg:w-1/4 bg-white rounded shadow p-4">
        <h2 className="text-xl font-bold mb-4">Hola, {name}</h2>
        <ul className="space-y-2">
          {tabs.map((t) => (
            <li key={t.key}>
              <button
                onClick={() => setTab(t.key)}
                className={`w-full text-left px-3 py-2 rounded ${
                  tab === t.key
                    ? "bg-blue-100 font-semibold"
                    : "hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Contenido */}
      <div className="flex-1 bg-white rounded shadow p-6">
        {tab === "summary" && <SummaryTab user={user} />}
        {tab === "orders" && <UserOrders userId={user.id} />}
        {tab === "settings" && <SettingsForm client:load />}
      </div>
    </div>
  );
}

// --- Resumen: KPIs del usuario ---
function SummaryTab({ user }) {
  const [stats, setStats] = useState({ orders: 0, spent: 0 });

  useEffect(() => {
    (async () => {
      const [{ data: orders }, { data: total }] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact" })
          .eq("customer_id", user.id),
        supabase.rpc("sum_amount_by_customer", { cust_id: user.id }), // suponiendo una función RPC
      ]);
      setStats({
        orders: orders?.length || 0,
        spent: total?.sum || 0,
      });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold mb-4">Resumen de cuenta</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">Nº Pedidos</p>
          <p className="text-3xl font-bold">{stats.orders}</p>
        </div>
      </div>
    </div>
  );
}
