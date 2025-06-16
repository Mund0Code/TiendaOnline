// src/components/DownloadButton.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function DownloadButton({ orderId, downloadUrl, onDownloaded }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    // 1) Marcamos el pedido como descargado
    const { error } = await supabase
      .from("orders")
      .update({ downloaded: true })
      .eq("id", orderId);

    if (error) {
      console.error("Error marcando como descargado:", error);
      setLoading(false);
      return;
    }

    // 2) Informamos al padre (ProfileDashboard) que recalcule
    onDownloaded?.();

    // 3) Abrimos la URL en nueva pestaña
    window.open(downloadUrl, "_blank");
    setLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`text-sm font-medium ${
        loading
          ? "text-gray-400 cursor-not-allowed"
          : "text-blue-600 hover:underline"
      }`}
    >
      {loading ? "Preparando..." : "Descargar Factura"}
    </button>
  );
}
