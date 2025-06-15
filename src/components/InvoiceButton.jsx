// src/components/InvoiceButton.jsx
import React, { useState } from "react";

export default function InvoiceButton({ orderId }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const { url: invoiceUrl, error: apiError } = await res.json();
      if (apiError) throw new Error(apiError);
      setUrl(invoiceUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        className="inline-block px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Descargar factura
      </a>
    );
  }
  return (
    <div className="space-y-2">
      <button
        onClick={generate}
        disabled={loading}
        className="inline-block px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Generando factura…" : "Obtener factura"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
