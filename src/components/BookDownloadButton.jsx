// src/components/BookDownloadButton.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function BookDownloadButton({
  orderId,
  productId,
  onDownloaded,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log(
    "BookDownloadButton recibí orderId:",
    orderId,
    "productId:",
    productId
  );

  const handleDownload = async () => {
    if (!orderId || !productId) {
      console.error("orderId o productId ausente:", { orderId, productId });
      setError("Datos de descarga incompletos");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obtener información del producto
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, name, file_path")
        .eq("id", productId)
        .single();

      if (productError || !product) {
        console.error("Error obteniendo producto:", productError);
        setError("Producto no encontrado");
        return;
      }

      console.log("📚 Producto encontrado:", product);

      if (!product.file_path) {
        console.error("Producto sin file_path:", product);
        setError("Archivo no configurado para este producto");
        return;
      }

      // 2. Verificar si el archivo existe en Storage
      const { data: fileExists, error: checkError } = await supabase.storage
        .from("books")
        .list("", {
          search: product.file_path,
        });

      console.log("🔍 Verificación de archivo:", { fileExists, checkError });

      if (checkError) {
        console.error("Error verificando archivo:", checkError);
        setError("Error verificando archivo");
        return;
      }

      if (!fileExists || fileExists.length === 0) {
        console.error("Archivo no encontrado en storage:", product.file_path);
        setError(`Archivo "${product.file_path}" no encontrado en el servidor`);
        return;
      }

      // 3. Crear URL firmada para descarga
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from("books")
        .createSignedUrl(product.file_path, 300); // 5 minutos

      if (urlError) {
        console.error("Error creando URL firmada:", urlError);
        setError(`Error generando enlace de descarga: ${urlError.message}`);
        return;
      }

      console.log("🔗 URL firmada creada:", signedUrlData.signedUrl);

      // 4. Marcar como descargado en la orden
      const { error: updateError } = await supabase
        .from("orders")
        .update({ downloaded: true })
        .eq("id", orderId);

      if (updateError) {
        console.error("Error actualizando estado de descarga:", updateError);
        // No bloquear la descarga por este error
      }

      // 5. Iniciar descarga
      const link = document.createElement("a");
      link.href = signedUrlData.signedUrl;
      link.download = product.name + ".pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("✅ Descarga iniciada exitosamente");

      // 6. Callback para refrescar datos
      if (onDownloaded) {
        onDownloaded();
      }
    } catch (err) {
      console.error("Error inesperado en descarga:", err);
      setError("Error inesperado durante la descarga");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="text-sm">
        <button
          onClick={handleDownload}
          className="text-red-600 hover:text-red-800 underline"
          disabled={loading}
        >
          {loading ? "Reintentando..." : "Reintentar descarga"}
        </button>
        <div className="text-red-500 text-xs mt-1">{error}</div>
      </div>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={`
        px-3 py-1 text-sm rounded transition-colors
        ${
          loading
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }
      `}
    >
      {loading ? "Descargando..." : "📥 Descargar"}
    </button>
  );
}
