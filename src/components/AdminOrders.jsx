// src/components/AdminOrders.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterAndSortOrders();
  }, [orders, searchTerm, statusFilter, sortBy, sortOrder]);

  const fetchOrders = async (showLoading = false) => {
    if (showLoading) setRefreshing(true);

    try {
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(
          `
          id,
          name,
          customer_email,
          amount_total,
          status,
          downloaded,
          invoice_downloaded,
          created_at,
          customer_id,
          checkout_session_id,
          order_items:order_items!order_items_order_id_fkey (
            id,
            quantity,
            unit_price,
            product:products!order_items_product_id_fkey (
              id,
              name,
              price
            )
          )
        `
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setOrders(data || []);
      setPagination((prev) => ({ ...prev, total: data?.length || 0 }));
      setError(null);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
      setError(err.message ?? "Error desconocido");
    } finally {
      setLoading(false);
      if (showLoading) setRefreshing(false);
    }
  };

  const filterAndSortOrders = () => {
    let filtered = orders.filter((order) => {
      const matchesSearch =
        order.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "amount_total") {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (sortBy === "created_at") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Pendiente" },
      paid: { color: "bg-green-100 text-green-800", label: "Pagado" },
      failed: { color: "bg-red-100 text-red-800", label: "Fallido" },
      refunded: { color: "bg-gray-100 text-gray-800", label: "Reembolsado" },
      processing: { color: "bg-blue-100 text-blue-800", label: "Procesando" },
    };

    const config = statusConfig[status] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      setSelectedOrder((prev) =>
        prev ? { ...prev, status: newStatus } : null
      );
    } catch (err) {
      setError(`Error actualizando estado: ${err.message}`);
    }
  };

  const openOrderDetails = async (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  // Paginación
  const paginatedOrders = filteredOrders.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  );

  const totalPages = Math.ceil(filteredOrders.length / pagination.limit);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestión de Pedidos
          </h1>
          <p className="text-gray-600 mt-1">
            {filteredOrders.length} de {orders.length} pedidos
          </p>
        </div>

        <button
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
          className={`
            mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors
            ${
              refreshing
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            }
          `}
        >
          {refreshing ? (
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
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg
              className="h-5 w-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar pedidos
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ID, email o producto..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro por estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
              <option value="processing">Procesando</option>
              <option value="failed">Fallido</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </div>

          {/* Ordenar por */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordenar por
            </label>
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Fecha</option>
                <option value="amount_total">Total</option>
                <option value="customer_email">Cliente</option>
              </select>
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title={`Ordenar ${sortOrder === "asc" ? "descendente" : "ascendente"}`}
              >
                <svg
                  className={`w-4 h-4 text-gray-600 transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 11l5-5m0 0l5 5m-5-5v12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de pedidos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {paginatedOrders.length === 0 ? (
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
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || statusFilter !== "all"
                ? "No se encontraron pedidos"
                : "No hay pedidos"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? "Intenta con otros filtros de búsqueda"
                : "Los pedidos aparecerán aquí cuando se realicen"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID / Cliente
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
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{order.id.slice(0, 8)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.customer_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.name || "Sin nombre"}
                        </div>
                        {order.order_items?.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {order.order_items.length} item(s)
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        €{Number(order.amount_total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString(
                          "es-ES",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openOrderDetails(order)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando{" "}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{" "}
                    a{" "}
                    <span className="font-medium">
                      {Math.min(
                        pagination.page * pagination.limit,
                        filteredOrders.length
                      )}
                    </span>{" "}
                    de{" "}
                    <span className="font-medium">{filteredOrders.length}</span>{" "}
                    resultados
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page - 1,
                        }))
                      }
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700">
                      Página {pagination.page} de {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page + 1,
                        }))
                      }
                      disabled={pagination.page === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de detalles del pedido */}
      {showDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles del Pedido #{selectedOrder.id.slice(0, 8)}
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Información general */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cliente
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedOrder.customer_email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Total
                  </label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    €{Number(selectedOrder.amount_total).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Estado actual
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fecha
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedOrder.created_at).toLocaleString("es-ES")}
                  </p>
                </div>
              </div>

              {/* Cambiar estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cambiar estado
                </label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) =>
                    updateOrderStatus(selectedOrder.id, e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pendiente</option>
                  <option value="paid">Pagado</option>
                  <option value="processing">Procesando</option>
                  <option value="failed">Fallido</option>
                  <option value="refunded">Reembolsado</option>
                </select>
              </div>

              {/* Items del pedido */}
              {selectedOrder.order_items &&
                selectedOrder.order_items.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">
                      Items del pedido
                    </h4>
                    <div className="space-y-2">
                      {selectedOrder.order_items.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.product?.name || "Producto eliminado"}
                            </p>
                            <p className="text-sm text-gray-500">
                              Cantidad: {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            €
                            {(
                              ((item.unit_price || 0) / 100) *
                              item.quantity
                            ).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Estados de descarga */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Producto descargado
                  </label>
                  <p
                    className={`mt-1 text-sm ${selectedOrder.downloaded ? "text-green-600" : "text-orange-600"}`}
                  >
                    {selectedOrder.downloaded ? "✅ Sí" : "⏳ No"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Factura descargada
                  </label>
                  <p
                    className={`mt-1 text-sm ${selectedOrder.invoice_downloaded ? "text-green-600" : "text-orange-600"}`}
                  >
                    {selectedOrder.invoice_downloaded ? "✅ Sí" : "⏳ No"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
