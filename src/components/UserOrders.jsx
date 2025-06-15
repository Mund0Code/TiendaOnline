// src/components/UserOrders.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import DownloadButton from "./DownloadButton.jsx";

export default function UserOrders({ userId }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    supabase
      .from("orders")
      .select(
        "checkout_session_id, name, amount_total, status, created_at, product_id"
      )
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data || []));
  }, [userId]);

  if (!orders.length) return <p>No has realizado ningún pedido.</p>;

  return (
    <ul className="space-y-4">
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
            {o.product_id && <DownloadButton productId={o.product_id} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
