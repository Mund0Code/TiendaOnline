// src/components/ProfileDashboard.jsx - Improved version
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import SettingsForm from "./SettingsForm.jsx";
import UserOrders from "./UserOrders.jsx";
import InvoiceDownloadButton from "./InvoiceDownloadButton.jsx";
import SupportForm from "./SupportForm.jsx";
import UserDownloads from "./UserDownloads.jsx";
import BookDownloadButton from "./BookDownloadButton.jsx";

export default function ProfileDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // métricas:
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [avgPerOrder, setAvgPerOrder] = useState(0);
  const [pendingBookDownloads, setPendingBookDownloads] = useState(0);
  const [pendingInvoiceDownloads, setPendingInvoiceDownloads] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [refreshLoading, setRefreshLoading] = useState(false);

  // 1) Carga sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return void (window.location.href = "/login");
      setUser(data.session.user);
      setLoading(false);
    });
  }, []);

  // 2) refreshMetrics mejorado
  const refreshMetrics = useCallback(
    async (showLoading = false) => {
      if (!user) return;

      if (showLoading) setRefreshLoading(true);

      try {
        const { data: orders = [], error } = await supabase
          .from("orders")
          .select(
            `
          id,
          created_at,
          amount_total,
          downloaded,
          invoice_url,
          invoice_downloaded,
          product_id,
          name,
          status,
          product:products!orders_product_id_fkey (
            id,
            name,
            file_path
          ),
          order_items:order_items!order_items_order_id_fkey (
            id,
            product_id,
            quantity,
            unit_price,
            product:products!order_items_product_id_fkey (
              id,
              name,
              file_path
            )
          )
        `
          )
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false });

        console.log("📦 orders completos:", JSON.stringify(orders, null, 2));

        if (error) {
          console.error("Error fetching orders:", error);
          return;
        }

        // Totales
        setTotalOrders(orders.length);
        const sum = orders.reduce(
          (acc, o) => acc + Number(o.amount_total || 0),
          0
        );
        setTotalSpent(sum);
        setAvgPerOrder(orders.length ? sum / orders.length : 0);

        // Pendientes
        setPendingBookDownloads(orders.filter((o) => !o.downloaded).length);
        setPendingInvoiceDownloads(
          orders.filter((o) => o.invoice_url && !o.invoice_downloaded).length
        );

        // Últimos 3 para la tabla
        const recentOrdersData = orders.slice(0, 3).map((o) => {
          let productName = "Producto no encontrado";
          let productId = null;

          // Priorizar order_items si existen
          if (o.order_items && o.order_items.length > 0) {
            const firstItem = o.order_items[0];
            if (firstItem.product) {
              productName = firstItem.product.name;
              productId = firstItem.product.id;
            }
          }
          // Usar product_id directo de la tabla orders
          else if (o.product_id && o.product) {
            productName = o.product.name;
            productId = o.product.id;
          }
          // Usar el campo name de la orden como fallback
          else if (o.name) {
            productName = o.name;
          }

          return {
            id: o.id,
            created_at: o.created_at,
            productName,
            product_id: productId,
            book_downloaded: o.downloaded,
            invoice_downloaded: o.invoice_downloaded,
            invoice_url: o.invoice_url,
            status: o.status || "completed",
            amount_total: o.amount_total,
          };
        });

        setRecentOrders(recentOrdersData);
      } catch (err) {
        console.error("Error refreshing metrics:", err);
      } finally {
        if (showLoading) setRefreshLoading(false);
      }
    },
    [user]
  );

  // 3) Ejecuta cuando `user` esté listo
  useEffect(() => {
    if (user) refreshMetrics();
  }, [user, refreshMetrics]);

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando tu dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      key: "summary",
      label: "Resumen",
      icon: "📊",
      description: "Vista general de tu cuenta",
    },
    {
      key: "orders",
      label: "Pedidos",
      icon: "📦",
      description: "Historial de compras",
    },
    {
      key: "invoice",
      label: "Facturas",
      icon: "📃",
      description: "Documentos fiscales",
    },
    {
      key: "support",
      label: "Soporte",
      icon: "💁‍♂️",
      description: "Ayuda y contacto",
    },
    {
      key: "settings",
      label: "Configuración",
      icon: "⚙️",
      description: "Ajustes de cuenta",
    },
  ];

  const displayName = user.user_metadata?.full_name || user.email.split("@")[0];
  const userInitials = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br mt-24 from-gray-50 to-blue-50">
      <div className="flex h-screen overflow-hidden">
        {/* Toggle botón para móvil */}
        <button
          onClick={() => setDrawerOpen((o) => !o)}
          className="fixed top-4 left-4 z-50 inline-flex items-center p-2 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg"
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
              d={
                drawerOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"
              }
            />
          </svg>
        </button>

        {/* Overlay para móvil */}
        {drawerOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden"
            onClick={() => setDrawerOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <aside
          className={`
          fixed top-0 left-0 z-40 w-72 h-full bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-xl
          transition-transform transform duration-300 ease-in-out
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"} sm:translate-x-0
        `}
        >
          <div className="h-full flex flex-col sm:overflow-auto">
            {/* Header del sidebar */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    ¡Hola, {displayName}!
                  </h2>
                  <p className="text-blue-100 text-sm truncate">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setTab(t.key);
                    setDrawerOpen(false);
                  }}
                  className={`
                    w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group
                    ${
                      tab === t.key
                        ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{t.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{t.label}</div>
                      <div className="text-xs text-gray-500 group-hover:text-gray-600">
                        {t.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </nav>

            {/* Footer del sidebar */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 overflow-auto sm:ml-72">
          <div className="p-6">
            {/* Header del contenido */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 capitalize">
                    {tabs.find((t) => t.key === tab)?.label || "Dashboard"}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {tabs.find((t) => t.key === tab)?.description ||
                      "Gestiona tu cuenta"}
                  </p>
                </div>
                {tab === "summary" && (
                  <button
                    onClick={() => refreshMetrics(true)}
                    disabled={refreshLoading}
                    className={`
                      mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors
                      ${
                        refreshLoading
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      }
                    `}
                  >
                    {refreshLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Actualizando...
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Contenido de las pestañas */}
            {tab === "summary" && (
              <div className="space-y-8">
                {/* Cards de métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  <MetricCard
                    title="Pedidos totales"
                    value={totalOrders}
                    icon="📦"
                    color="blue"
                  />
                  <MetricCard
                    title="Total gastado"
                    value={`€${totalSpent.toFixed(2)}`}
                    icon="💰"
                    color="green"
                  />
                  <MetricCard
                    title="Gasto promedio"
                    value={`€${avgPerOrder.toFixed(2)}`}
                    icon="📊"
                    color="purple"
                  />
                  <MetricCard
                    title="Pendientes descarga"
                    value={pendingBookDownloads}
                    icon="⬇️"
                    color="orange"
                    alert={pendingBookDownloads > 0}
                  />
                  <MetricCard
                    title="Facturas pendientes"
                    value={pendingInvoiceDownloads}
                    icon="📄"
                    color="red"
                    alert={pendingInvoiceDownloads > 0}
                  />
                </div>

                {/* Tabla de últimos pedidos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Últimos pedidos
                    </h3>
                    <p className="text-sm text-gray-600">
                      Tus 3 pedidos más recientes
                    </p>
                  </div>

                  {recentOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Fecha
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Producto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Estado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {recentOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(order.created_at).toLocaleDateString(
                                  "es-ES",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {order.productName}
                                    </div>
                                    {!order.product_id && (
                                      <div className="text-xs text-red-500">
                                        Sin ID de producto
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                €{order.amount_total?.toFixed(2) || "0.00"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge
                                  downloaded={order.book_downloaded}
                                  hasProduct={!!order.product_id}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  {!order.book_downloaded &&
                                  order.product_id ? (
                                    <BookDownloadButton
                                      orderId={order.id}
                                      productId={order.product_id}
                                      onDownloaded={() => refreshMetrics()}
                                    />
                                  ) : order.book_downloaded ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      ✓ Descargado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      No disponible
                                    </span>
                                  )}

                                  {order.invoice_url &&
                                    !order.invoice_downloaded && (
                                      <InvoiceDownloadButton
                                        orderId={order.id}
                                        url={order.invoice_url}
                                        onDownloaded={() => refreshMetrics()}
                                      />
                                    )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V10a1 1 0 011-1z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No hay pedidos
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        ¡Empieza comprando tu primer producto!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "orders" && (
              <UserOrders
                userId={user.id}
                onDownloaded={() => refreshMetrics()}
              />
            )}
            {tab === "invoice" && <UserDownloads userId={user.id} />}
            {tab === "support" && <SupportForm />}
            {tab === "settings" && <SettingsForm />}
          </div>
        </main>
      </div>
    </div>
  );
}

// Componente MetricCard mejorado
function MetricCard({ title, value, icon, color = "blue", alert = false }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div
      className={`
      relative overflow-hidden rounded-xl border p-6 shadow-sm transition-transform hover:scale-105
      ${alert ? colorClasses.red : colorClasses[color]}
      ${alert ? "ring-2 ring-red-300 animate-pulse" : ""}
    `}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
      {alert && (
        <div className="absolute top-2 right-2">
          <div className="h-2 w-2 bg-red-500 rounded-full animate-ping"></div>
        </div>
      )}
    </div>
  );
}

// Componente StatusBadge
function StatusBadge({ downloaded, hasProduct }) {
  if (!hasProduct) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Sin producto
      </span>
    );
  }

  if (downloaded) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        ✓ Completado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      ⏳ Pendiente
    </span>
  );
}
