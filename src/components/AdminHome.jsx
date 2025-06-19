// src/components/AdminHome.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminHome() {
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalClients: 0,
  });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // 1) Cargar métricas globales (contar filas y sumar ingresos)
    Promise.all([
      supabase
        .from("orders")
        .select("amount_total", { count: "exact", columns: [] }),
      supabase.from("products").select("id", { count: "exact", columns: [] }),
      supabase.from("profiles").select("id", { count: "exact", columns: [] }),
      supabase.from("orders").select("amount_total"),
    ]).then(([ordersCount, productsCount, usersCount, ordersData]) => {
      const totalOrders = ordersCount.count || 0;
      const totalProducts = productsCount.count || 0;
      const totalClients = usersCount.count || 0;
      const totalIncome =
        ordersData.data?.reduce((sum, o) => sum + Number(o.amount_total), 0) ||
        0;

      setStats({
        totalIncome: totalIncome.toFixed(2),
        totalOrders,
        totalProducts,
        totalClients,
      });
    });

    // 2) Datos de ventas últimos 7 días
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });

    supabase
      .from("orders")
      .select("amount_total, created_at")
      .gte("created_at", days[0])
      .then(({ data }) => {
        const grouped = days.map((date) => ({
          date: date.slice(5),
          total: data
            .filter((o) => o.created_at.startsWith(date))
            .reduce((sum, o) => sum + Number(o.amount_total), 0),
        }));
        setChartData(grouped);
      });
  }, []);

  return (
    <div className="space-y-6 mt-10">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MetricCard label="Pedidos totales" value={stats.totalOrders} />
        <MetricCard label="Ingresos (€)" value={stats.totalIncome} />
        <MetricCard label="Productos" value={stats.totalProducts} />
        <MetricCard label="Clientes" value={stats.totalClients} />
      </div>

      {/* Gráfico de barras */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Ventas últimos 7 días</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(v) => `€${v}`} />
            <Bar dataKey="total" fill="#3182CE" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-white p-4 rounded shadow text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
