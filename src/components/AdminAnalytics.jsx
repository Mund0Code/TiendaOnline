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

  if (loading) return <p>Cargando analíticas…</p>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Analíticas Reales</h3>

      {/* Ventas últimos 7 días */}
      <div className="bg-white p-4 rounded shadow">
        <h4 className="font-medium mb-2">Ventas últimos 7 días</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
            <Bar dataKey="total" fill="#3182CE" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ventas últimos 12 meses */}
      <div className="bg-white p-4 rounded shadow">
        <h4 className="font-medium mb-2">Ventas últimos 12 meses</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
            <Line type="monotone" dataKey="total" stroke="#38A169" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
