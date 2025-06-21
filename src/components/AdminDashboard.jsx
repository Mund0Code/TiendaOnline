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
import AdminSupport from "./AdminSupport.jsx";

const TABS = {
  home: {
    label: "Resumen",
    component: <AdminHome client:load />,
    icon: "🏠",
  },
  orders: {
    label: "Pedidos",
    component: <AdminOrders client:load />,
    icon: "📦",
  },
  products: {
    label: "Productos",
    component: <AdminProducts client:load />,
    icon: "🛒",
  },
  categories: {
    label: "Categorías",
    component: <AdminCategories client:load />,
    icon: "🗂️",
  },
  users: {
    label: "Clientes",
    component: <AdminUsers client:load />,
    icon: "👥",
  },
  analytics: {
    label: "Analíticas",
    component: <AdminAnalytics client:load />,
    icon: "📊",
  },
  support: {
    label: "Soporte",
    component: <AdminSupport client:load />,
    icon: "🎧",
  },
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <h3 className="text-xl font-semibold text-gray-700">
              Cargando panel de administración
            </h3>
            <p className="text-gray-500 text-center">
              Verificando permisos y preparando el dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Overlay para móvil cuando sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Botón hamburguesa para móviles */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white rounded-xl shadow-lg p-3 hover:shadow-xl transition-all duration-200 hover:scale-105"
      >
        <svg
          className={`w-6 h-6 text-gray-700 transition-transform duration-200 ${sidebarOpen ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar mejorado */}
      <aside
        className={`
        fixed top-0 left-0 z-40 w-72 h-screen transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
      `}
      >
        <div className="h-full bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl">
          {/* Header del sidebar */}
          <div className="h-full p-6 border-b border-gray-200/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
                <p className="text-sm text-gray-500">Dashboard de gestión</p>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <nav className="p-4 space-y-2">
            {Object.entries(TABS).map(([key, tab]) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                  ${
                    activeTab === key
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-[1.02]"
                      : "text-gray-700 hover:bg-gray-100 hover:scale-[1.01]"
                  }
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
                {activeTab === key && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                )}
              </button>
            ))}
          </nav>

          {/* Footer del sidebar */}
          <div className="bottom-4 left-4 right-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200/50">
              <p className="text-sm text-gray-600 font-medium">
                Panel Administrativo
              </p>
              <p className="text-xs text-gray-500">Versión 2.0</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="lg:ml-72 min-h-screen mt-24">
        {/* Contenido de la página */}
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{TABS[activeTab].component}</div>
        </div>
      </main>
    </div>
  );
}
