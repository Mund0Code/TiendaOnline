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
    label: "📋 Resumen",
    component: <AdminHome />,
    icon: "🏠",
  },
  orders: {
    label: "📦 Pedidos",
    component: <AdminOrders />,
    icon: "📦",
  },
  products: {
    label: "🛒 Productos",
    component: <AdminProducts />,
    icon: "🛒",
  },
  categories: {
    label: "🗂️ Categorías",
    component: <AdminCategories />,
    icon: "🗂️",
  },
  users: {
    label: "👥 Clientes",
    component: <AdminUsers />,
    icon: "👥",
  },
  analytics: {
    label: "📊 Analíticas",
    component: <AdminAnalytics />,
    icon: "📊",
  },
  support: {
    label: "🎧 Soporte",
    component: <AdminSupport />,
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
          <div className="p-6 border-b border-gray-200/50">
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
          <div className="absolute bottom-4 left-4 right-4">
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
      <main className="lg:ml-72 min-h-screen">
        {/* Header superior */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
          <div className="px-6 py-4 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="ml-16 lg:ml-0">
                <h1 className="text-2xl font-bold text-gray-900">
                  {TABS[activeTab].label}
                </h1>
                <p className="text-gray-600 mt-1">
                  Gestiona tu plataforma desde aquí
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600 font-medium">
                    Online
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido de la página */}
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{TABS[activeTab].component}</div>
        </div>
      </main>
    </div>
  );
}
