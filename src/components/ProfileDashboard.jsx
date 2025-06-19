// src/components/ProfileDashboard.jsx - Debug version
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

  // 1) Carga sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return void (window.location.href = "/login");
      setUser(data.session.user);
      setLoading(false);
    });
  }, []);

  // 2) refreshMetrics - Versión que maneja ambas estructuras
  const refreshMetrics = useCallback(async () => {
    if (!user) return;

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
    const sum = orders.reduce((acc, o) => acc + Number(o.amount_total || 0), 0);
    setTotalSpent(sum);
    setAvgPerOrder(orders.length ? sum / orders.length : 0);

    // Pendientes
    setPendingBookDownloads(orders.filter((o) => !o.downloaded).length);
    setPendingInvoiceDownloads(
      orders.filter((o) => !o.invoice_downloaded).length
    );

    // Últimos 3 para la tabla - Maneja ambas estructuras
    const recentOrdersData = orders.slice(0, 3).map((o) => {
      let productName = "Producto no encontrado";
      let productId = null;

      // Opción 1: Usar product_id directo de la tabla orders
      if (o.product_id && o.product) {
        productName = o.product.name;
        productId = o.product.id;
      }
      // Opción 2: Usar el primer item de order_items
      else if (o.order_items && o.order_items.length > 0) {
        const firstItem = o.order_items[0];
        if (firstItem.product) {
          productName = firstItem.product.name;
          productId = firstItem.product.id;
        }
      }
      // Opción 3: Usar el campo name de la orden si existe
      else if (o.name) {
        productName = o.name;
        // En este caso no tenemos product_id, así que será null
      }

      console.log(`🔍 Order ${o.id}:`, {
        orderProductId: o.product_id,
        orderProduct: o.product,
        orderItems: o.order_items,
        finalProductName: productName,
        finalProductId: productId,
        downloaded: o.downloaded,
        invoice_url: o.invoice_url,
        invoice_downloaded: o.invoice_downloaded,
      });

      return {
        id: o.id,
        created_at: o.created_at,
        productName,
        product_id: productId,
        book_downloaded: o.downloaded,
        invoice_downloaded: o.invoice_downloaded,
        invoice_url: o.invoice_url,
      };
    });

    console.log("📋 Recent orders processed:", recentOrdersData);
    setRecentOrders(recentOrdersData);
  }, [user]);

  // 3) Ejecuta cuando `user` esté listo
  useEffect(() => {
    if (user) refreshMetrics();
  }, [user, refreshMetrics]);

  if (loading) return <p className="p-6 text-center">Comprobando sesión…</p>;

  const tabs = [
    { key: "summary", label: "Resumen", icon: "📊" },
    { key: "orders", label: "Pedidos", icon: "📦" },
    { key: "invoice", label: "Facturas", icon: "📃" },
    { key: "support", label: "Soporte", icon: "💁‍♂️" },
    { key: "settings", label: "Configuración", icon: "⚙️" },
  ];
  const displayName = user.user_metadata?.full_name || user.email.split("@")[0];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Toggle botón para móvil */}
      <button
        onClick={() => setDrawerOpen((o) => !o)}
        className="inline-flex items-center p-2 mt-2 ms-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100"
        aria-label="Toggle sidebar"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 w-64 h-full bg-gray-50 border-r
          transition-transform transform
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"} sm:translate-x-0
        `}
      >
        <div className="h-full flex flex-col p-4 dark:bg-gray-800">
          <h2 className="text-xl font-bold text-white mb-6">
            Hola, {displayName}
          </h2>
          <nav className="flex-1">
            <ul className="space-y-2">
              {tabs.map((t) => (
                <li key={t.key}>
                  <button
                    onClick={() => {
                      setTab(t.key);
                      setDrawerOpen(false);
                    }}
                    className={`
                      flex items-center w-full px-4 py-2 rounded-lg hover:bg-gray-700
                      ${tab === t.key ? "bg-blue-600 text-white" : "text-gray-100"}
                    `}
                  >
                    <span className="mr-2">{t.icon}</span>
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-6 overflow-auto bg-gray-100 sm:ml-64">
        {tab === "summary" && (
          <div className="space-y-6 mt-24">
            {/* Cards de métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card label="Pedidos totales" value={totalOrders} />
              <Card label="Total gastado (€)" value={totalSpent.toFixed(2)} />
              <Card label="Gasto medio (€)" value={avgPerOrder.toFixed(2)} />
              <Card label="Libros sin descargar" value={pendingBookDownloads} />
              <Card
                label="Facturas sin descargar"
                value={pendingInvoiceDownloads}
              />
            </div>

            {/* Tabla de últimos pedidos */}
            <div className="bg-white p-4 rounded shadow">
              <h4 className="font-semibold mb-2">Últimos pedidos</h4>
              {recentOrders.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2">Fecha</th>
                      <th className="py-2">Producto</th>
                      <th className="py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="border-b">
                        <td className="py-2">
                          {new Date(o.created_at).toLocaleDateString("es-ES")}
                        </td>
                        <td className="py-2">
                          <span
                            className={
                              o.product_id ? "text-gray-900" : "text-gray-500"
                            }
                          >
                            {o.productName}
                          </span>
                          {!o.product_id && (
                            <span className="text-xs text-red-500 block">
                              (Sin ID de producto)
                            </span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex space-x-2">
                            {/* Debug información */}
                            <div className="text-xs text-gray-500 mb-1">
                              Debug: downloaded={String(o.book_downloaded)},
                              has_product_id={String(!!o.product_id)}
                            </div>

                            {/* Botón descarga libro */}
                            {!o.book_downloaded && o.product_id ? (
                              <BookDownloadButton
                                orderId={o.id}
                                productId={o.product_id}
                                onDownloaded={refreshMetrics}
                              />
                            ) : o.book_downloaded ? (
                              <span className="text-sm text-green-500 px-2 py-1 bg-green-50 rounded">
                                ✓ Descargado
                              </span>
                            ) : (
                              <span className="text-sm text-orange-500 px-2 py-1 bg-orange-50 rounded">
                                Producto no vinculado
                              </span>
                            )}

                            {/* Botón descarga factura */}
                            {o.invoice_url && !o.invoice_downloaded ? (
                              <InvoiceDownloadButton
                                orderId={o.id}
                                url={o.invoice_url}
                                onDownloaded={refreshMetrics}
                              />
                            ) : o.invoice_url && o.invoice_downloaded ? (
                              <span className="text-sm text-blue-500 px-2 py-1 bg-blue-50 rounded">
                                ✓ Factura descargada
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">
                                Sin factura
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No tienes pedidos recientes
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <UserOrders userId={user.id} onDownloaded={refreshMetrics} />
        )}
        {tab === "invoice" && <UserDownloads userId={user.id} />}
        {tab === "support" && <SupportForm client:load />}
        {tab === "settings" && <SettingsForm client:load />}
      </main>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="bg-white p-4 rounded shadow text-center">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
