// src/components/UserDownloads.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function UserDownloads({ userId }) {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select(
          "id, invoice_url, product_id, name, amount_total, status, created_at"
        )
        .eq("customer_id", userId)
        .not("invoice_url", "is", null);

      setFiles(orders || []);
    })();
  }, [userId]);

  const formatDateUTC = (iso) => {
    const d = new Date(iso);
    const YYYY = d.getUTCFullYear();
    const MM = String(d.getUTCMonth() + 1).padStart(2, "0");
    const DD = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    const ss = String(d.getUTCSeconds()).padStart(2, "0");
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
  };

  if (!files.length) {
    return (
      <div className="mt-16">
        <p className="text-center">No hay descargas disponibles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-16">
      <h3 className="text-2xl font-semibold">Facturas</h3>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3 bg-gray-50 dark:bg-gray-800">
                Product name
              </th>
              <th scope="col" className="px-6 py-3 bg-gray-50 dark:bg-gray-800">
                Created at
              </th>
              <th scope="col" className="px-6 py-3 bg-gray-50 dark:bg-gray-800">
                Status
              </th>
              <th scope="col" className="px-6 py-3 bg-gray-50 dark:bg-gray-800">
                Price
              </th>
              <th scope="col" className="px-6 py-3 bg-gray-50 dark:bg-gray-800">
                Download
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((o) => (
              <tr
                key={o.id}
                className="border-b border-gray-200 dark:border-gray-700"
              >
                <th
                  scope="row"
                  className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap bg-gray-50 dark:text-white dark:bg-gray-800"
                >
                  {o.name}
                </th>
                <td className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                  {formatDateUTC(o.created_at)}
                </td>
                <td className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                  {o.status}
                </td>
                <td className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                  {o.amount_total} €
                </td>
                <td className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                  <a
                    href={o.invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white hover:underline"
                  >
                    Descargar tu factura
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
