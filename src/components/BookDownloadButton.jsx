import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function BookDownloadButton({
  orderId,
  productId,
  onDownloaded,
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    console.log("BookDownloadButton recibí orderId:", orderId);
    setLoading(true);
    if (!orderId || !productId) {
      console.error("orderId o productId ausente:", { orderId, productId });
      setLoading(false);
      return;
    }

    // 1) Recupera el file_path del producto
    const { data: prod, error: prodErr } = await supabase
      .from("products")
      .select("file_path")
      .eq("id", productId)
      .single();
    if (prodErr || !prod?.file_path) {
      console.error("Error buscando producto:", prodErr);
      setLoading(false);
      return;
    }

    // 2) Genera URL firmada del libro
    const { data: urlData, error: urlErr } = await supabase.storage
      .from("books")
      .createSignedUrl(prod.file_path, 60 * 60);
    if (urlErr || !urlData?.signedUrl) {
      console.error("Error creando URL firmada:", urlErr);
      setLoading(false);
      return;
    }

    // 3) Marca el pedido como descargado
    const { data, error } = await supabase
      .from("orders")
      .update({ downloaded: true })
      .eq("id", orderId)
      .select();
    console.log("UPDATE downloaded:", { data, error });
    if (error) console.error("⚠️ Error marcando libro descargado:", error);
    else {
      onDownloaded?.(); // <–– sólo si no hay error
    }
    // 4) Refresca métricas y abre el PDF
    await onDownloaded?.();
    window.open(urlData.signedUrl, "_blank");
    setLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`text-sm font-medium ${
        loading
          ? "text-gray-400 cursor-not-allowed"
          : "text-green-600 hover:underline"
      }`}
    >
      {loading ? "Preparando libro…" : "Descargar libro"}
    </button>
  );
}
