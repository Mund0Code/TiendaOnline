// src/components/AdminAnalytics.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format, subDays, subMonths } from "date-fns";

export default function AdminAnalytics() {
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // 1) Traer pedidos del último mes para analíticas diarias
      const oneWeekAgo = subDays(new Date(), 6).toISOString();
      const { data: weekOrders = [] } = await supabase
        .from("orders")
        .select("amount_total, created_at")
        .gte("created_at", oneWeekAgo);

      // Agrupar por día
      const weekMap = {};
      for (let i = 0; i < 7; i++) {
        const d = subDays(new Date(), 6 - i);
        const key = format(d, "EEE"); // e.g. "Mon","Tue"
        weekMap[key] = 0;
      }
      weekOrders.forEach(({ amount_total, created_at }) => {
        const day = format(new Date(created_at), "EEE");
        weekMap[day] += Number(amount_total);
      });
      setWeeklyData(
        Object.entries(weekMap).map(([day, total]) => ({ day, total }))
      );

      // 2) Traer pedidos del último año para analíticas mensuales
      const oneYearAgo = subMonths(new Date(), 11).toISOString();
      const { data: yearOrders = [] } = await supabase
        .from("orders")
        .select("amount_total, created_at")
        .gte("created_at", oneYearAgo);

      // Agrupar por mes
      const monthMap = {};
      for (let i = 0; i < 12; i++) {
        const d = subMonths(new Date(), 11 - i);
        const key = format(d, "MMM"); // e.g. "Jan","Feb"
        monthMap[key] = 0;
      }
      yearOrders.forEach(({ amount_total, created_at }) => {
        const mon = format(new Date(created_at), "MMM");
        if (monthMap[mon] !== undefined) monthMap[mon] += Number(amount_total);
      });
      setMonthlyData(
        Object.entries(monthMap).map(([month, total]) => ({ month, total }))
      );

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-lg font-medium text-gray-700">
              Cargando analíticas…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            📊 Analíticas Avanzadas
          </h1>
          <p className="text-gray-600 text-lg">
            Datos en tiempo real de tus ventas
          </p>
        </div>

        {/* Ventas últimos 7 días */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📈 Ventas Últimos 7 Días
            </h2>
            <p className="text-blue-100 text-sm">
              Tendencia semanal de ingresos
            </p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={weeklyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <Tooltip
                  formatter={(v) => [`€${v.toFixed(2)}`, "Ventas"]}
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "12px",
                    color: "white",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="url(#blueGradient)"
                  radius={[4, 4, 0, 0]}
                />
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ventas últimos 12 meses */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📊 Ventas Últimos 12 Meses
            </h2>
            <p className="text-emerald-100 text-sm">
              Evolución anual de ingresos
            </p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <Tooltip
                  formatter={(v) => [`€${v.toFixed(2)}`, "Ventas"]}
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "12px",
                    color: "white",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 8, fill: "#059669" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer motivacional */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-3 shadow-lg border border-gray-100">
            <span className="text-2xl">🚀</span>
            <p className="text-gray-700 font-medium">¡Mantén el crecimiento!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
