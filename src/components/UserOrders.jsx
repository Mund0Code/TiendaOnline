// src/components/UserOrders.jsx - Corregido para mostrar todos los productos
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import BookDownloadButton from "./BookDownloadButton.jsx";

export default function UserOrders({ userId, onDownloaded }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      console.log("🔍 UserOrders: Fetching orders for userId:", userId);

      // Obtener órdenes con información completa
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          checkout_session_id,
          created_at,
          amount_total,
          downloaded,
          name,
          product_id,
          product:products!orders_product_id_fkey (
            id,
            name,
            file_path
          ),
          order_items!order_items_order_id_fkey (
            id,
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
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });

      console.log("📦 UserOrders: Orders fetched:", { orders, error });

      if (error) {
        console.error("Error fetching orders:", error);
        setLoading(false);
        return;
      }

      // Agrupar items por orden para mejor visualización
      const groupedItems = [];

      (orders || []).forEach((order) => {
        console.log(`🔍 Processing order ${order.id}:`, {
          hasOrderItems: order.order_items?.length > 0,
          hasDirectProduct: !!order.product,
          orderName: order.name,
          orderItemsCount: order.order_items?.length || 0,
        });

        // Crear un objeto de orden base
        const baseOrder = {
          orderId: order.id,
          sessionId: order.checkout_session_id,
          createdAt: order.created_at,
          totalAmount: order.amount_total,
          orderDownloaded: order.downloaded,
          orderName: order.name,
        };

        // Si tiene order_items, mostrar cada producto por separado
        if (order.order_items && order.order_items.length > 0) {
          order.order_items.forEach((item, index) => {
            if (item.product) {
              groupedItems.push({
                ...baseOrder,
                itemId: item.id,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                productId: item.product.id,
                productName: item.product.name,
                productFile: item.product.file_path,
                source: "order_items",
                isFirstItem: index === 0, // Para mostrar info de la orden solo en el primer item
                totalItems: order.order_items.length,
              });
            } else {
              console.warn(`⚠️ Order item ${item.id} has no product`);
              // Mostrar item sin producto
              groupedItems.push({
                ...baseOrder,
                itemId: item.id,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                productId: null,
                productName: `Producto no encontrado (Item ${item.id})`,
                productFile: null,
                source: "order_items_no_product",
                isFirstItem: index === 0,
                totalItems: order.order_items.length,
              });
            }
          });
        }
        // Si no tiene order_items pero tiene product directo, usar ese
        else if (order.product) {
          groupedItems.push({
            ...baseOrder,
            itemId: `order-${order.id}`,
            quantity: 1,
            unitPrice: order.amount_total * 100,
            productId: order.product.id,
            productName: order.product.name,
            productFile: order.product.file_path,
            source: "direct_product",
            isFirstItem: true,
            totalItems: 1,
          });
        }
        // Si no tiene ni order_items ni product, pero tiene nombre
        else if (order.name) {
          groupedItems.push({
            ...baseOrder,
            itemId: `order-${order.id}`,
            quantity: 1,
            unitPrice: order.amount_total * 100,
            productId: null,
            productName: order.name,
            productFile: null,
            source: "order_name",
            isFirstItem: true,
            totalItems: 1,
          });
        }
      });

      console.log("📋 UserOrders: Grouped items:", groupedItems);
      setItems(groupedItems);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="mt-24 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p>Cargando pedidos...</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="mt-24 text-center bg-white rounded-xl shadow-sm border border-gray-200 p-12">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V10a1 1 0 011-1z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No hay pedidos
        </h3>
        <p className="text-gray-600 mb-6">
          Los pedidos aparecerán aquí después de completar una compra.
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          Explorar libros
        </a>
      </div>
    );
  }

  // Agrupar items por orden para mostrar mejor
  const orderGroups = {};
  items.forEach((item) => {
    if (!orderGroups[item.orderId]) {
      orderGroups[item.orderId] = [];
    }
    orderGroups[item.orderId].push(item);
  });

  return (
    <div className="mt-24">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Mis Pedidos</h2>

      <div className="space-y-6">
        {Object.entries(orderGroups).map(([orderId, orderItems]) => {
          const firstItem = orderItems[0];
          const totalOrderAmount = firstItem.totalAmount;

          return (
            <div
              key={orderId}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Header de la orden */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Pedido #
                      {firstItem.sessionId?.slice(-8) || orderId.slice(-8)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(firstItem.createdAt).toLocaleDateString(
                        "es-ES",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-right">
                    <p className="text-lg font-bold text-gray-900">
                      €{totalOrderAmount?.toFixed(2) || "0.00"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {orderItems.length}{" "}
                      {orderItems.length === 1 ? "producto" : "productos"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items de la orden */}
              <div className="divide-y divide-gray-100">
                {orderItems.map((item, index) => (
                  <div key={item.itemId} className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-start space-x-4">
                          {/* Icono del producto */}
                          <div className="w-12 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-6 h-6 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-medium text-gray-900 mb-1">
                              {item.productName}
                              {item.quantity > 1 && (
                                <span className="ml-2 text-sm text-gray-500">
                                  ×{item.quantity}
                                </span>
                              )}
                            </h4>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600">
                                Precio unitario: €
                                {(item.unitPrice / 100).toFixed(2)}
                              </p>
                              {item.quantity > 1 && (
                                <p className="text-sm text-gray-600">
                                  Subtotal: €
                                  {(
                                    (item.unitPrice * item.quantity) /
                                    100
                                  ).toFixed(2)}
                                </p>
                              )}
                              <div className="flex items-center space-x-2 text-xs">
                                <span
                                  className={`px-2 py-1 rounded-full ${
                                    item.source === "order_items"
                                      ? "bg-green-100 text-green-700"
                                      : item.source === "direct_product"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {item.source}
                                </span>
                                {item.productId && (
                                  <span className="text-gray-500">
                                    ID: {item.productId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botón de descarga */}
                      <div className="flex-shrink-0">
                        {item.productId ? (
                          !item.orderDownloaded ? (
                            <BookDownloadButton
                              orderId={item.orderId}
                              productId={item.productId}
                              onDownloaded={onDownloaded}
                            />
                          ) : (
                            <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg">
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Descargado
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg">
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                              />
                            </svg>
                            No disponible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
