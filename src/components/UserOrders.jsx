// src/components/UserOrders.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import BookDownloadButton from "./BookDownloadButton.jsx";

export default function UserOrders({ userId, onDownloaded }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      // 1) Trae tus orders + sus items + producto, especificando la relación correcta
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          checkout_session_id,
          created_at,
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
        .order("created_at", { ascending: false }); // aquí ya es sobre orders

      console.log({ orders, error });

      if (error) {
        console.error("Error fetching orders:", error);
        return;
      }

      // 2) Aplana a 1 elemento por cada línea de pedido
      const flat = (orders || []).flatMap((order) =>
        (order.order_items || []).map((it) => ({
          orderId: order.id,
          sessionId: order.checkout_session_id,
          createdAt: order.created_at,
          itemId: it.id,
          quantity: it.quantity,
          unitPrice: it.unit_price,
          productId: it.product.id,
          productName: it.product.name,
          productFile: it.product.file_path,
        }))
      );

      setItems(flat);
    })();
  }, [userId]);

  if (!items.length)
    return (
      <div className="mt-24 text-center">
        <p>No has realizado ningún pedido.</p>
      </div>
    );

  return (
    <ul className="space-y-4 mt-24">
      {items.map((it) => (
        <li
          key={it.itemId}
          className="p-4 bg-gray-100 rounded flex justify-between items-center"
        >
          <div>
            <p className="font-medium">
              {it.productName} ×{it.quantity}
            </p>
            <p className="text-sm">
              Pedido #{it.sessionId.slice(-6)} —{" "}
              {new Date(it.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <BookDownloadButton
              orderId={it.orderId}
              productId={it.productId}
              onDownloaded={onDownloaded}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
