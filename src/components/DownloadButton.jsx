// src/components/DownloadButton.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function DownloadButton({ productId }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const [filePath, setFilePath] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) Saca file_path
        const { data: prod, error: prodErr } = await supabase
          .from("products")
          .select("file_path")
          .eq("id", productId)
          .single();

        console.log("⏺️ DownloadButton: producto:", prod, "error:", prodErr);

        if (prodErr) throw prodErr;
        if (!prod?.file_path) throw new Error("file_path está vacío en la BD");

        setFilePath(prod.file_path);

        // 2) Pide la URL firmada
        const res = await fetch(
          `/api/download?file_path=${encodeURIComponent(prod.file_path)}`
        );
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.error || "Error al obtener URL de descarga");
        setUrl(json.url);
      } catch (err) {
        console.error("DownloadButton error:", err);
        setError(err.message);
      }
    })();
  }, [productId]);

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Error: {error}
        {filePath === null ? null : <div>file_path leído: "{filePath}"</div>}
      </div>
    );
  }
  if (!url) {
    return (
      <p className="text-gray-600">
        Cargando enlace... (file_path: {filePath || "no leído aún"})
      </p>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
    >
      Descargar tu libro
    </a>
  );
}
