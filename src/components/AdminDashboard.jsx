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
    icon: "📋",
    component: <AdminHome />,
    description: "Vista general del panel",
  },
  orders: {
    label: "Pedidos",
    icon: "📦",
    component: <AdminOrders />,
    description: "Gestión de órdenes",
  },
  products: {
    label: "Productos",
    icon: "🛒",
    component: <AdminProducts />,
    description: "Catálogo de productos",
  },
  categories: {
    label: "Categorías",
    icon: "🗂️",
    component: <AdminCategories />,
    description: "Organización de productos",
  },
  users: {
    label: "Clientes",
    icon: "👥",
    component: <AdminUsers />,
    description: "Gestión de usuarios",
  },
  analytics: {
    label: "Analíticas",
    icon: "📊",
    component: <AdminAnalytics />,
    description: "Métricas y reportes",
  },
  support: {
    label: "Soporte",
    icon: "🎧",
    component: <AdminSupport />,
    description: "Centro de ayuda",
  },
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    checkAdminAccess();
    loadNotifications();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        redirectToLogin();
        return;
      }

      setUser(session.user);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("is_admin, full_name, avatar_url")
        .eq("id", session.user.id)
        .single();

      if (error || !profileData?.is_admin) {
        redirectToLogin();
        return;
      }

      setProfile(profileData);
      setLoading(false);
    } catch (error) {
      console.error("Error checking admin access:", error);
      redirectToLogin();
    }
  };

  const loadNotifications = async () => {
    try {
      // Simulación de notificaciones - puedes conectar con tu sistema real
      const mockNotifications = [
        {
          id: 1,
          type: "order",
          message: "3 nuevos pedidos pendientes",
          time: "Hace 5 min",
        },
        {
          id: 2,
          type: "support",
          message: "2 tickets de soporte sin responder",
          time: "Hace 1 hora",
        },
        {
          id: 3,
          type: "user",
          message: "5 nuevos usuarios registrados",
          time: "Hace 2 horas",
        },
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      redirectToLogin();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order":
        return "📦";
      case "support":
        return "🎧";
      case "user":
        return "👥";
      default:
        return "🔔";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Cargando Panel de Administración
          </h2>
          <p className="text-gray-500">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "Admin";
  const userInitials = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Toggle botón para móvil */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 sm:hidden inline-flex items-center p-3 text-gray-600 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg hover:bg-white transition-all duration-200"
        aria-label="Toggle sidebar"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed top-0 left-0 z-40 w-80 h-full bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-2xl
        transition-transform transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} sm:translate-x-0
      `}
      >
        <div className="h-full flex flex-col">
          {/* Header del sidebar */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full border-2 border-white/30"
                  />
                ) : (
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold text-white">
                    {userInitials}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">
                  {displayName}
                </h2>
                <p className="text-blue-100 text-sm">Administrador</p>
              </div>
            </div>
          </div>

          {/* Notificaciones rápidas */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Notificaciones
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-gray-100"
                >
                  <span className="text-sm">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500">{notification.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Menú principal
            </h3>
            {Object.entries(TABS).map(([key, tab]) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group
                  ${
                    activeTab === key
                      ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm scale-105"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:scale-102"
                  }
                `}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-xl">{tab.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs opacity-75 group-hover:opacity-100 transition-opacity">
                      {tab.description}
                    </div>
                  </div>
                  {activeTab === key && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </button>
            ))}
          </nav>

          {/* Footer del sidebar */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="space-y-2">
              <button className="w-full flex items-center space-x-3 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="font-medium">Configuración</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="font-medium">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="sm:ml-80 min-h-screen">
        {/* Header del contenido */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <span className="text-3xl">{TABS[activeTab].icon}</span>
                <span>{TABS[activeTab].label}</span>
              </h1>
              <p className="text-gray-600 mt-1">
                {TABS[activeTab].description}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Indicador de notificaciones */}
              <div className="relative">
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-5 5-5-5h5V3z"
                    />
                  </svg>
                </button>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </div>

              {/* Estado del sistema */}
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Sistema activo</span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido de la pestaña activa */}
        <div className="p-6">
          <div className="transition-all duration-300 ease-in-out">
            {TABS[activeTab].component}
          </div>
        </div>
      </main>

      {/* Quick Actions Floating Button (opcional) */}
      <div className="fixed bottom-6 right-6 z-30">
        <div className="group relative">
          <button className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Acciones rápidas
          </div>
        </div>
      </div>

      {/* Breadcrumb invisible para SEO */}
      <nav aria-label="Breadcrumb" className="sr-only">
        <ol>
          <li>Panel de Administración</li>
          <li aria-current="page">{TABS[activeTab].label}</li>
        </ol>
      </nav>
    </div>
  );
}
