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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from "recharts";
import { format, subDays, subMonths, startOfDay } from "date-fns";

export default function AdminHome() {
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalClients: 0,
    pendingOrders: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    growthRate: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [productStats, setProductStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("7d");

  // Colores para gráficos
  const COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
  ];

  const fetchDashboardData = async (showLoading = false) => {
    if (showLoading) setRefreshing(true);

    try {
      // 1. Métricas principales
      const [
        ordersResponse,
        productsResponse,
        usersResponse,
        allOrdersResponse,
      ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", columns: [] }),
        supabase.from("products").select("id", { count: "exact", columns: [] }),
        supabase.from("profiles").select("id", { count: "exact", columns: [] }),
        supabase
          .from("orders")
          .select("amount_total, created_at, status, customer_id"),
      ]);

      const totalOrders = ordersResponse.count || 0;
      const totalProducts = productsResponse.count || 0;
      const totalClients = usersResponse.count || 0;
      const allOrders = allOrdersResponse.data || [];

      const totalIncome = allOrders.reduce(
        (sum, o) => sum + Number(o.amount_total || 0),
        0
      );
      const avgOrderValue = totalOrders > 0 ? totalIncome / totalOrders : 0;
      const pendingOrders = allOrders.filter(
        (o) => o.status === "pending"
      ).length;

      // Calcular tasa de conversión (usuarios únicos que han comprado vs total usuarios)
      const uniqueCustomers = new Set(allOrders.map((o) => o.customer_id)).size;
      const conversionRate =
        totalClients > 0 ? (uniqueCustomers / totalClients) * 100 : 0;

      // Calcular crecimiento (comparar último mes vs mes anterior)
      const lastMonth = subMonths(new Date(), 1);
      const recentOrders = allOrders.filter(
        (o) => new Date(o.created_at) >= lastMonth
      );
      const previousMonth = subMonths(new Date(), 2);
      const prevOrders = allOrders.filter(
        (o) =>
          new Date(o.created_at) >= previousMonth &&
          new Date(o.created_at) < lastMonth
      );

      const recentIncome = recentOrders.reduce(
        (sum, o) => sum + Number(o.amount_total || 0),
        0
      );
      const prevIncome = prevOrders.reduce(
        (sum, o) => sum + Number(o.amount_total || 0),
        0
      );
      const growthRate =
        prevIncome > 0 ? ((recentIncome - prevIncome) / prevIncome) * 100 : 0;

      setStats({
        totalIncome: totalIncome.toFixed(2),
        totalOrders,
        totalProducts,
        totalClients,
        pendingOrders,
        avgOrderValue: avgOrderValue.toFixed(2),
        conversionRate: conversionRate.toFixed(1),
        growthRate: growthRate.toFixed(1),
      });

      // 2. Datos del gráfico temporal
      const days = timeRange === "30d" ? 30 : 7;
      const dateRange = Array.from({ length: days }).map((_, i) => {
        const d = subDays(new Date(), days - 1 - i);
        return {
          date: format(d, "yyyy-MM-dd"),
          displayDate: format(d, days === 30 ? "dd/MM" : "EEE"),
          fullDate: d,
        };
      });

      const startDate = dateRange[0].date;
      const { data: ordersInRange } = await supabase
        .from("orders")
        .select("amount_total, created_at")
        .gte("created_at", startDate);

      const chartDataArray = dateRange.map(({ date, displayDate }) => {
        const dayOrders = ordersInRange.filter((o) =>
          o.created_at.startsWith(date)
        );
        return {
          date: displayDate,
          ventas: dayOrders.reduce(
            (sum, o) => sum + Number(o.amount_total || 0),
            0
          ),
          pedidos: dayOrders.length,
        };
      });

      setChartData(chartDataArray);

      // 3. Estadísticas de productos más vendidos
      const { data: orderItems } = await supabase.from("order_items").select(`
          quantity,
          unit_price,
          product:products!order_items_product_id_fkey (
            id,
            name
          )
        `);

      const productMap = {};
      orderItems?.forEach((item) => {
        if (item.product) {
          const productName = item.product.name;
          if (!productMap[productName]) {
            productMap[productName] = {
              name: productName,
              ventas: 0,
              cantidad: 0,
            };
          }
          productMap[productName].ventas +=
            (Number(item.unit_price || 0) * Number(item.quantity || 1)) / 100;
          productMap[productName].cantidad += Number(item.quantity || 1);
        }
      });

      const topProducts = Object.values(productMap)
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, 5);

      setProductStats(topProducts);

      // 4. Actividad reciente
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("id, created_at, amount_total, customer_email")
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      const activities = [
        ...(recentOrders?.map((order) => ({
          type: "order",
          message: `Nuevo pedido de €${Number(order.amount_total).toFixed(2)}`,
          time: format(new Date(order.created_at), "HH:mm"),
          date: format(new Date(order.created_at), "dd/MM"),
          user: order.customer_email,
        })) || []),
        ...(recentUsers?.map((user) => ({
          type: "user",
          message: `Nuevo usuario registrado`,
          time: format(new Date(user.created_at), "HH:mm"),
          date: format(new Date(user.created_at), "dd/MM"),
          user: user.full_name || "Usuario",
        })) || []),
      ]
        .sort(
          (a, b) =>
            new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`)
        )
        .slice(0, 8);

      setRecentActivity(activities);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      if (showLoading) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
          <p className="text-gray-600 mt-1">Vista general del negocio</p>
        </div>

        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
          </select>

          <button
            onClick={() => fetchDashboardData(true)}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Ingresos totales"
          value={`€${stats.totalIncome}`}
          change={stats.growthRate}
          icon="💰"
          color="green"
        />
        <KPICard
          title="Pedidos totales"
          value={stats.totalOrders}
          subtitle={`${stats.pendingOrders} pendientes`}
          icon="📦"
          color="blue"
        />
        <KPICard
          title="Valor promedio"
          value={`€${stats.avgOrderValue}`}
          subtitle="Por pedido"
          icon="📊"
          color="purple"
        />
        <KPICard
          title="Tasa conversión"
          value={`${stats.conversionRate}%`}
          subtitle={`${stats.totalClients} usuarios`}
          icon="🎯"
          color="orange"
        />
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de ventas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Ventas {timeRange === "7d" ? "diarias" : "últimos 30 días"}
              </h3>
              <p className="text-sm text-gray-600">
                Evolución de ingresos y pedidos
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
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
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
                formatter={(value, name) => [
                  name === "ventas" ? `€${Number(value).toFixed(2)}` : value,
                  name === "ventas" ? "Ventas" : "Pedidos",
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
                dataKey="ventas"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#salesGradient)"
              />
              <Line
                type="monotone"
                dataKey="pedidos"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top productos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Top productos
              </h3>
              <p className="text-sm text-gray-600">Más vendidos por ingresos</p>
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
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-xs">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.cantidad} unidades
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      €{product.ventas.toFixed(2)}
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
      </div>

      {/* Actividad reciente y estadísticas adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Actividad reciente */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Actividad reciente
              </h3>
              <p className="text-sm text-gray-600">
                Últimos eventos del sistema
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div
                  className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${activity.type === "order" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}
                `}
                >
                  {activity.type === "order" ? "📦" : "👤"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.message}
                  </p>
                  <p className="text-xs text-gray-500">{activity.user}</p>
                </div>
                <div className="text-xs text-gray-400">
                  {activity.date} {activity.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen rápido */}
        <div className="space-y-6">
          {/* Estado del sistema */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Estado del sistema
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Base de datos</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
                  Operativo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
                  Operativo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pagos</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
                  Operativo
                </span>
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Acciones rápidas
            </h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                📦 Ver pedidos pendientes
              </button>
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                🛒 Agregar producto
              </button>
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                📊 Ver analíticas completas
              </button>
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                🎧 Centro de soporte
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente KPI Card mejorado
function KPICard({ title, value, change, subtitle, icon, color = "blue" }) {
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
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium opacity-75">{title}</p>
            <span className="text-lg">{icon}</span>
          </div>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
          {typeof change === "number" && (
            <div
              className={`flex items-center mt-2 text-sm ${getChangeColor(change)}`}
            >
              <span className="mr-1">{getChangeIcon(change)}</span>
              <span className="font-medium">
                {Math.abs(change).toFixed(1)}% vs mes anterior
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
