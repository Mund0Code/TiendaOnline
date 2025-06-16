import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function InvoiceDownloadButton({ orderId, url, onDownloaded }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    console.log("InvoiceDownloadButton recibí orderId:", orderId);
    setLoading(true);
    // 1) Actualiza el flag en la BBDD
    const { data, error } = await supabase
      .from("orders")
      .update({ invoice_downloaded: true })
      .eq("id", orderId)
      .select();
    console.log("UPDATE invoice_downloaded:", { data, error });

    if (error) console.error("⚠️ Error marcando factura descargada:", error);
    else {
      onDownloaded?.();
    }

    // 2) Refresca métricas y abre la factura
    await onDownloaded?.();
    window.open(url, "_blank");
    setLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-blue-600 hover:underline"
    >
      {loading ? "Preparando factura…" : "Descargar factura"}
    </button>
  );
}
