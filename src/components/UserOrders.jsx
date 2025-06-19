// src/components/UserOrders.jsx
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

      // Procesar órdenes para crear items para mostrar
      const processedItems = [];

      (orders || []).forEach((order) => {
        console.log(`🔍 Processing order ${order.id}:`, {
          hasOrderItems: order.order_items?.length > 0,
          hasDirectProduct: !!order.product,
          orderName: order.name,
        });

        // Si la orden tiene order_items, usar esos
        if (order.order_items && order.order_items.length > 0) {
          order.order_items.forEach((item) => {
            if (item.product) {
              processedItems.push({
                orderId: order.id,
                sessionId: order.checkout_session_id,
                createdAt: order.created_at,
                itemId: item.id,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                productId: item.product.id,
                productName: item.product.name,
                productFile: item.product.file_path,
                orderDownloaded: order.downloaded,
                source: "order_items",
              });
            } else {
              console.warn(`⚠️ Order item ${item.id} has no product`);
            }
          });
        }
        // Si no tiene order_items pero tiene product directo, usar ese
        else if (order.product) {
          processedItems.push({
            orderId: order.id,
            sessionId: order.checkout_session_id,
            createdAt: order.created_at,
            itemId: `order-${order.id}`, // ID sintético
            quantity: 1,
            unitPrice: order.amount_total * 100, // Convertir a centavos
            productId: order.product.id,
            productName: order.product.name,
            productFile: order.product.file_path,
            orderDownloaded: order.downloaded,
            source: "direct_product",
          });
        }
        // Si no tiene ni order_items ni product, pero tiene nombre, mostrar eso
        else if (order.name) {
          processedItems.push({
            orderId: order.id,
            sessionId: order.checkout_session_id,
            createdAt: order.created_at,
            itemId: `order-${order.id}`, // ID sintético
            quantity: 1,
            unitPrice: order.amount_total * 100,
            productId: null,
            productName: order.name,
            productFile: null,
            orderDownloaded: order.downloaded,
            source: "order_name",
          });
        }
      });

      console.log("📋 UserOrders: Processed items:", processedItems);
      setItems(processedItems);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="mt-24 text-center">
        <p>Cargando pedidos...</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="mt-24 text-center">
        <p>No has realizado ningún pedido.</p>
        <p className="text-sm text-gray-500 mt-2">
          Los pedidos aparecerán aquí después de completar una compra.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-24">
      <h2 className="text-2xl font-bold mb-6">Mis Pedidos</h2>
      <ul className="space-y-4">
        {items.map((it) => (
          <li
            key={it.itemId}
            className="p-4 bg-white rounded-lg shadow border flex justify-between items-center"
          >
            <div className="flex-1">
              <p className="font-medium text-lg">
                {it.productName} {it.quantity > 1 && `×${it.quantity}`}
              </p>
              <p className="text-sm text-gray-600">
                Pedido #{it.sessionId?.slice(-6) || "N/A"} —{" "}
                {new Date(it.createdAt).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-sm text-gray-500">
                Precio: €{(it.unitPrice / 100).toFixed(2)}
                {it.source && (
                  <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                    {it.source}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col items-end space-y-2">
              {it.productId ? (
                !it.orderDownloaded ? (
                  <BookDownloadButton
                    orderId={it.orderId}
                    productId={it.productId}
                    onDownloaded={onDownloaded}
                  />
                ) : (
                  <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    ✓ Descargado
                  </span>
                )
              ) : (
                <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                  Producto no vinculado
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
