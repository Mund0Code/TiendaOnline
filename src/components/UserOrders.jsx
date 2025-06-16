// src/components/UserOrders.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import BookDownloadButton from "./BookDownloadButton.jsx";

export default function UserOrders({ userId, onDownloaded }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    supabase
      .from("orders")
      .select(
        `
      id,
      checkout_session_id,
      name,
      amount_total,
      status,
      created_at,
      product_id,
      downloaded,
      product:products(name)
    `
      )
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        console.log("📦 fetched orders in UserOrders:", data);
        setOrders(data || []);
      });
  }, [userId]);

  if (!orders.length) return <p>No has realizado ningún pedido.</p>;

  return (
    <ul className="space-y-4 mt-16">
      {orders.map((o) => (
        <li
          key={o.checkout_session_id}
          className="p-4 bg-gray-50 rounded flex justify-between"
        >
          <div>
            <p className="font-medium">{o.name}</p>
            <p className="font-medium">
              Pedido #{o.checkout_session_id.slice(-6)}
            </p>
            <p className="text-sm">{new Date(o.created_at).toLocaleString()}</p>
          </div>
          <div>
            {o.product_id ? (
              <BookDownloadButton
                orderId={o.id}
                productId={o.product_id}
                onDownloaded={onDownloaded}
              />
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
