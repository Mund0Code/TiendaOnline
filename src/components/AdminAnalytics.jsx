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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";

export default function AdminAnalytics() {
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [productStats, setProductStats] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalUsers: 0,
    conversionRate: 0,
    topProduct: "",
    revenueGrowth: 0,
    ordersGrowth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d"); // 7d, 30d, 12m
  const [refreshing, setRefreshing] = useState(false);

  // Colores para gráficos
  const COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#84CC16",
    "#EC4899",
  ];

  const fetchAnalytics = async (showLoading = false) => {
    if (showLoading) setRefreshing(true);

    try {
      // Fechas según el rango seleccionado
      const now = new Date();
      let startDate, periodCount;

      switch (timeRange) {
        case "7d":
          startDate = subDays(now, 6);
          periodCount = 7;
          break;
        case "30d":
          startDate = subDays(now, 29);
          periodCount = 30;
          break;
        case "12m":
          startDate = subMonths(now, 11);
          periodCount = 12;
          break;
        default:
          startDate = subDays(now, 6);
          periodCount = 7;
      }

      // 1. KPIs generales
      const { data: allOrders = [] } = await supabase
        .from("orders")
        .select("amount_total, created_at, customer_id")
        .gte("created_at", startDate.toISOString());

      const { data: allTimeOrders = [] } = await supabase
        .from("orders")
        .select("amount_total, created_at, customer_id");

      const { data: users = [] } = await supabase
        .from("profiles")
        .select("id, created_at");

      // Calcular KPIs
      const totalRevenue = allOrders.reduce(
        (sum, order) => sum + Number(order.amount_total || 0),
        0
      );
      const totalOrders = allOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const uniqueCustomers = new Set(allOrders.map((o) => o.customer_id)).size;
      const totalUsers = users.length;
      const conversionRate =
        totalUsers > 0 ? (uniqueCustomers / totalUsers) * 100 : 0;

      // Crecimiento comparado con período anterior
      const previousPeriodStart =
        timeRange === "12m"
          ? subMonths(startDate, 12)
          : subDays(startDate, periodCount);

      const { data: previousOrders = [] } = await supabase
        .from("orders")
        .select("amount_total")
        .gte("created_at", previousPeriodStart.toISOString())
        .lt("created_at", startDate.toISOString());

      const previousRevenue = previousOrders.reduce(
        (sum, order) => sum + Number(order.amount_total || 0),
        0
      );
      const revenueGrowth =
        previousRevenue > 0
          ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
          : 0;
      const ordersGrowth =
        previousOrders.length > 0
          ? ((totalOrders - previousOrders.length) / previousOrders.length) *
            100
          : 0;

      // 2. Datos temporales para gráficos
      let timeData = [];

      if (timeRange === "12m") {
        // Datos mensuales
        const monthMap = {};
        for (let i = 0; i < 12; i++) {
          const d = subMonths(now, 11 - i);
          const key = format(d, "MMM yyyy");
          monthMap[key] = { month: format(d, "MMM"), revenue: 0, orders: 0 };
        }

        allOrders.forEach(({ amount_total, created_at }) => {
          const key = format(new Date(created_at), "MMM yyyy");
          if (monthMap[key]) {
            monthMap[key].revenue += Number(amount_total || 0);
            monthMap[key].orders += 1;
          }
        });

        timeData = Object.values(monthMap);
        setMonthlyData(timeData);
      } else {
        // Datos diarios
        const dayMap = {};
        for (let i = 0; i < periodCount; i++) {
          const d = subDays(now, periodCount - 1 - i);
          const key = format(d, "yyyy-MM-dd");
          dayMap[key] = {
            day: timeRange === "30d" ? format(d, "dd/MM") : format(d, "EEE"),
            revenue: 0,
            orders: 0,
            date: d,
          };
        }

        allOrders.forEach(({ amount_total, created_at }) => {
          const key = format(new Date(created_at), "yyyy-MM-dd");
          if (dayMap[key]) {
            dayMap[key].revenue += Number(amount_total || 0);
            dayMap[key].orders += 1;
          }
        });

        timeData = Object.values(dayMap);
        setWeeklyData(timeData);
      }

      // 3. Estadísticas por producto
      const { data: orderItems = [] } = await supabase
        .from("order_items")
        .select(
          `
          quantity,
          unit_price,
          product:products!order_items_product_id_fkey (
            id,
            name
          ),
          order:orders!order_items_order_id_fkey (
            created_at
          )
        `
        )
        .gte("order.created_at", startDate.toISOString());

      const productMap = {};
      orderItems.forEach((item) => {
        if (item.product) {
          const productName = item.product.name;
          if (!productMap[productName]) {
            productMap[productName] = {
              name: productName,
              revenue: 0,
              quantity: 0,
              orders: 0,
            };
          }
          productMap[productName].revenue +=
            (Number(item.unit_price || 0) * Number(item.quantity || 1)) / 100;
          productMap[productName].quantity += Number(item.quantity || 1);
          productMap[productName].orders += 1;
        }
      });

      const productStatsArray = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const topProduct =
        productStatsArray.length > 0 ? productStatsArray[0].name : "N/A";

      // 4. Estadísticas de usuarios por período
      const userMap = {};
      if (timeRange === "12m") {
        for (let i = 0; i < 12; i++) {
          const d = subMonths(now, 11 - i);
          const key = format(d, "MMM");
          userMap[key] = 0;
        }
        users.forEach((user) => {
          if (user.created_at) {
            const key = format(new Date(user.created_at), "MMM");
            if (userMap[key] !== undefined) userMap[key] += 1;
          }
        });
      } else {
        for (let i = 0; i < periodCount; i++) {
          const d = subDays(now, periodCount - 1 - i);
          const key =
            timeRange === "30d" ? format(d, "dd/MM") : format(d, "EEE");
          userMap[key] = 0;
        }
        users
          .filter((u) => u.created_at && new Date(u.created_at) >= startDate)
          .forEach((user) => {
            const key =
              timeRange === "30d"
                ? format(new Date(user.created_at), "dd/MM")
                : format(new Date(user.created_at), "EEE");
            if (userMap[key] !== undefined) userMap[key] += 1;
          });
      }

      const userStatsArray = Object.entries(userMap).map(([period, count]) => ({
        period,
        users: count,
      }));

      // Actualizar estados
      setKpis({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        totalUsers,
        conversionRate,
        topProduct,
        revenueGrowth,
        ordersGrowth,
      });
      setProductStats(productStatsArray);
      setUserStats(userStatsArray);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
      if (showLoading) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando analíticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analíticas</h1>
          <p className="text-gray-600 mt-1">Panel de control de rendimiento</p>
        </div>

        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          {/* Selector de rango */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="12m">Últimos 12 meses</option>
          </select>

          {/* Botón refresh */}
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className={`
              inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors
              ${
                refreshing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              }
            `}
          >
            {refreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Actualizando...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Actualizar
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Ingresos totales"
          value={`€${kpis.totalRevenue.toFixed(2)}`}
          change={kpis.revenueGrowth}
          icon="💰"
          color="green"
        />
        <KPICard
          title="Pedidos totales"
          value={kpis.totalOrders}
          change={kpis.ordersGrowth}
          icon="📦"
          color="blue"
        />
        <KPICard
          title="Valor promedio"
          value={`€${kpis.avgOrderValue.toFixed(2)}`}
          icon="📊"
          color="purple"
        />
        <KPICard
          title="Tasa conversión"
          value={`${kpis.conversionRate.toFixed(1)}%`}
          icon="🎯"
          color="orange"
        />
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de ingresos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {timeRange === "12m"
                  ? "Ingresos mensuales"
                  : "Ingresos diarios"}
              </h3>
              <p className="text-sm text-gray-600">
                Evolución de ventas en el período
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeRange === "12m" ? monthlyData : weeklyData}>
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey={timeRange === "12m" ? "month" : "day"}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
                tickFormatter={(value) => `€${value}`}
              />
              <Tooltip
                formatter={(value) => [
                  `€${Number(value).toFixed(2)}`,
                  "Ingresos",
                ]}
                labelStyle={{ color: "#374151" }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de pedidos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {timeRange === "12m" ? "Pedidos mensuales" : "Pedidos diarios"}
              </h3>
              <p className="text-sm text-gray-600">
                Cantidad de órdenes procesadas
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeRange === "12m" ? monthlyData : weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey={timeRange === "12m" ? "month" : "day"}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <Tooltip
                formatter={(value) => [value, "Pedidos"]}
                labelStyle={{ color: "#374151" }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Bar dataKey="orders" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top productos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Top productos
              </h3>
              <p className="text-sm text-gray-600">
                Los más vendidos por ingresos
              </p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>

          {productStats.length > 0 ? (
            <div className="space-y-4">
              {productStats.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full`}
                      style={{ backgroundColor: COLORS[index] }}
                    ></div>
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-xs">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.quantity} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      €{product.revenue.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {product.orders} pedidos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                No hay datos de productos
              </p>
            </div>
          )}
        </div>

        {/* Nuevos usuarios */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Nuevos usuarios
              </h3>
              <p className="text-sm text-gray-600">Registros en el período</p>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg
                className="w-5 h-5 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <Tooltip
                formatter={(value) => [value, "Nuevos usuarios"]}
                labelStyle={{ color: "#374151" }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#F59E0B"
                strokeWidth={3}
                dot={{ fill: "#F59E0B", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#F59E0B" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Componente KPI Card
function KPICard({ title, value, change, icon, color = "blue" }) {
  const colorClasses = {
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
  };

  const getChangeColor = (change) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getChangeIcon = (change) => {
    if (change > 0) return "↗️";
    if (change < 0) return "↘️";
    return "➡️";
  };

  return (
    <div
      className={`rounded-xl border p-6 shadow-sm transition-transform hover:scale-105 ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {typeof change === "number" && (
            <div
              className={`flex items-center mt-2 text-sm ${getChangeColor(change)}`}
            >
              <span className="mr-1">{getChangeIcon(change)}</span>
              <span className="font-medium">
                {Math.abs(change).toFixed(1)}% vs período anterior
              </span>
            </div>
          )}
        </div>
        <div className="text-2xl ml-4">{icon}</div>
      </div>
    </div>
  );
}
