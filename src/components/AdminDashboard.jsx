// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { redirectToLogin } from "../lib/utils";

import AdminHome from "./AdminHome.jsx";
import AdminOrders from "./AdminOrders.jsx";
import AdminProducts from "./AdminProducts.jsx";
import AdminCategories from "./AdminCategories.jsx";
import AdminUsers from "./AdminUsers.jsx";
import AdminAnalytics from "./AdminAnalytics.jsx";
import Sidebar from "./Sidebar.jsx";

const TABS = {
  home: { label: "Resumen", component: <AdminHome /> },
  orders: { label: "Pedidos", component: <AdminOrders /> },
  products: { label: "Productos", component: <AdminProducts /> },
  categories: { label: "Categorías", component: <AdminCategories /> },
  users: { label: "Clientes", component: <AdminUsers /> },
  analytics: { label: "Analíticas", component: <AdminAnalytics /> },
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return redirectToLogin();

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      if (error || !profile?.is_admin) return redirectToLogin();
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <p className="p-6 text-center">Cargando panel de administración…</p>;
  }

  return (
    <>
      {/* Botón para abrir/ocultar sidebar en móviles */}
      <button
        data-drawer-target="admin-sidebar"
        data-drawer-toggle="admin-sidebar"
        aria-controls="admin-sidebar"
        className="sm:hidden fixed top-4 left-4 z-50 inline-flex items-center p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
      >
        <span className="sr-only">Abrir menú</span>
        {/* Icono hamburguesa */}
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5h-14.5a.75.75 0 0 1-.75-.75zm0-5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10z"
          />
        </svg>
      </button>

      {/* Sidebar fija en sm+, drawer en móvil */}
      <Sidebar
        id="admin-sidebar"
        items={TABS}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      {/* Contenido principal */}
      <main className="sm:ml-64 p-6 bg-gray-50 min-h-screen">
        {TABS[activeTab].component}
      </main>
    </>
  );
}
