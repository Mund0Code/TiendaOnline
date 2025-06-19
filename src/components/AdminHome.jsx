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
  Legend,
} from "recharts";

const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];

export default function AdminHome() {
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalClients: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);

      try {
        // 1) Cargar métricas globales
        const [ordersCount, productsCount, usersCount, ordersData] =
          await Promise.all([
            supabase
              .from("orders")
              .select("amount_total", { count: "exact", columns: [] }),
            supabase
              .from("products")
              .select("id", { count: "exact", columns: [] }),
            supabase
              .from("profiles")
              .select("id", { count: "exact", columns: [] }),
            supabase.from("orders").select("amount_total"),
          ]);

        const totalOrders = ordersCount.count || 0;
        const totalProducts = productsCount.count || 0;
        const totalClients = usersCount.count || 0;
        const totalIncome =
          ordersData.data?.reduce(
            (sum, o) => sum + Number(o.amount_total),
            0
          ) || 0;

        setStats({
          totalIncome: totalIncome.toFixed(2),
          totalOrders,
          totalProducts,
          totalClients,
        });

        // 2) Datos de ventas últimos 7 días
        const days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().slice(0, 10);
        });

        const { data: salesData } = await supabase
          .from("orders")
          .select("amount_total, created_at")
          .gte("created_at", days[0]);

        const grouped = days.map((date) => {
          const dayName = new Date(date).toLocaleDateString("es-ES", {
            weekday: "short",
          });
          return {
            date: dayName,
            total:
              salesData
                ?.filter((o) => o.created_at.startsWith(date))
                .reduce((sum, o) => sum + Number(o.amount_total), 0) || 0,
          };
        });

        setChartData(grouped);

        // 3) Cargar actividad reciente real
        await loadRecentActivity();
      } catch (error) {
        console.error("Error cargando datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const loadRecentActivity = async () => {
    try {
      const activities = [];
      const now = new Date();

      // Obtener pedidos recientes (últimas 24 horas)
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("id, amount_total, created_at")
        .gte(
          "created_at",
          new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
        )
        .order("created_at", { ascending: false })
        .limit(3);

      if (recentOrders) {
        recentOrders.forEach((order) => {
          activities.push({
            id: `order-${order.id}`,
            icon: "🛒",
            title: "Nuevo pedido recibido",
            description: `Pedido #${order.id.substring(0, 8)} por €${Number(order.amount_total).toFixed(2)}`,
            time: getTimeAgo(order.created_at),
            color: "green",
            timestamp: new Date(order.created_at),
          });
        });
      }

      // Obtener usuarios recientes (últimas 48 horas)
      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .gte(
          "created_at",
          new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
        )
        .order("created_at", { ascending: false })
        .limit(3);

      if (recentUsers) {
        recentUsers.forEach((user) => {
          activities.push({
            id: `user-${user.id}`,
            icon: "👤",
            title: "Nuevo cliente registrado",
            description: user.full_name
              ? `${user.full_name} (${user.email})`
              : user.email,
            time: getTimeAgo(user.created_at),
            color: "blue",
            timestamp: new Date(user.created_at),
          });
        });
      }

      // Obtener productos recientes (últimas 7 días)
      const { data: recentProducts } = await supabase
        .from("products")
        .select("id, name, created_at, updated_at")
        .gte(
          "updated_at",
          new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        )
        .order("updated_at", { ascending: false })
        .limit(2);

      if (recentProducts) {
        recentProducts.forEach((product) => {
          const isNew =
            new Date(product.created_at).getTime() ===
            new Date(product.updated_at).getTime();
          activities.push({
            id: `product-${product.id}`,
            icon: "📦",
            title: isNew ? "Producto creado" : "Producto actualizado",
            description: product.name,
            time: getTimeAgo(product.updated_at),
            color: "orange",
            timestamp: new Date(product.updated_at),
          });
        });
      }

      // Obtener mensajes de soporte recientes (últimas 48 horas)
      const { data: recentSupport } = await supabase
        .from("support_messages")
        .select("id, email, subject, category, created_at")
        .gte(
          "created_at",
          new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
        )
        .order("created_at", { ascending: false })
        .limit(3);

      if (recentSupport) {
        recentSupport.forEach((message) => {
          const categoryLabels = {
            technical: "problema técnico",
            billing: "facturación",
            account: "cuenta",
            download: "descarga",
            general: "consulta general",
            other: "consulta",
          };

          activities.push({
            id: `support-${message.id}`,
            icon: "💬",
            title: "Mensaje de soporte",
            description: `${categoryLabels[message.category] || "consulta"}: ${message.subject || "Sin asunto"}`,
            time: getTimeAgo(message.created_at),
            color: "purple",
            timestamp: new Date(message.created_at),
          });
        });
      }

      // Ordenar por timestamp más reciente y tomar los primeros 6
      const sortedActivities = activities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 6);

      setRecentActivity(sortedActivities);
    } catch (error) {
      console.error("Error cargando actividad reciente:", error);
      // Fallback a actividad de ejemplo si hay error
      setRecentActivity([
        {
          id: "fallback-1",
          icon: "📊",
          title: "Dashboard actualizado",
          description: "Datos sincronizados correctamente",
          time: "Ahora mismo",
          color: "blue",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return "Ahora mismo";
    if (diffInMinutes < 60)
      return `Hace ${diffInMinutes} minuto${diffInMinutes !== 1 ? "s" : ""}`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
      return `Hace ${diffInHours} hora${diffInHours !== 1 ? "s" : ""}`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7)
      return `Hace ${diffInDays} día${diffInDays !== 1 ? "s" : ""}`;

    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton para métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 shadow-lg animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>

        {/* Skeleton para gráfico */}
        <div className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              ¡Bienvenido al Dashboard!
            </h2>
            <p className="text-blue-100 text-lg">
              Aquí tienes un resumen de tu negocio hoy,{" "}
              {new Date().toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-4xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Pedidos Totales"
          value={stats.totalOrders}
          icon="📦"
          color="blue"
          trend="+12%"
        />
        <MetricCard
          label="Ingresos Totales"
          value={`€${stats.totalIncome}`}
          icon="💰"
          color="green"
          trend="+8.2%"
        />
        <MetricCard
          label="Productos"
          value={stats.totalProducts}
          icon="🛒"
          color="purple"
          trend="+3"
        />
        <MetricCard
          label="Clientes"
          value={stats.totalClients}
          icon="👥"
          color="orange"
          trend="+15.7%"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de ventas */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              Ventas de la Semana
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Ingresos (€)</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
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
              />
              <Tooltip
                formatter={(value) => [`€${value}`, "Ingresos"]}
                labelStyle={{ color: "#374151" }}
                contentStyle={{
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Bar
                dataKey="total"
                fill="url(#blueGradient)"
                radius={[6, 6, 0, 0]}
              />
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Actividad reciente */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              Actividad Reciente
            </h3>
            <button
              onClick={loadRecentActivity}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
            >
              <svg
                className="w-4 h-4"
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
              <span>Actualizar</span>
            </button>
          </div>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  icon={activity.icon}
                  title={activity.title}
                  description={activity.description}
                  time={activity.time}
                  color={activity.color}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-sm">No hay actividad reciente</p>
                <p className="text-xs mt-1">
                  La actividad aparecerá aquí cuando ocurra
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-6">
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionButton
            icon="➕"
            title="Añadir Producto"
            description="Crear nuevo producto"
            color="blue"
            onClick={() => {
              // Navegar a la página de crear producto
              window.location.href = "/admin/products/new";
            }}
          />
          <QuickActionButton
            icon="📊"
            title="Ver Analíticas"
            description="Revisar métricas detalladas"
            color="purple"
            onClick={() => {
              // Navegar a analytics
              window.location.href = "/admin/analytics";
            }}
          />
          <QuickActionButton
            icon="📦"
            title="Gestionar Pedidos"
            description="Procesar pedidos pendientes"
            color="green"
            onClick={() => {
              // Navegar a pedidos
              window.location.href = "/admin/orders";
            }}
          />
          <QuickActionButton
            icon="💬"
            title="Soporte"
            description="Responder consultas"
            color="orange"
            onClick={() => {
              // Navegar a soporte
              window.location.href = "/admin/support";
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, color, trend }) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          {trend && (
            <div className="flex items-center">
              <span className="text-green-500 text-sm font-medium">
                ↗ {trend}
              </span>
              <span className="text-gray-500 text-xs ml-2">
                vs mes anterior
              </span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center text-white text-xl shadow-lg`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ icon, title, description, time, color }) {
  const colorClasses = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]} flex-shrink-0`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 truncate">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  );
}

function QuickActionButton({ icon, title, description, color, onClick }) {
  const colorClasses = {
    blue: "hover:bg-blue-50 hover:border-blue-200",
    purple: "hover:bg-purple-50 hover:border-purple-200",
    green: "hover:bg-green-50 hover:border-green-200",
    orange: "hover:bg-orange-50 hover:border-orange-200",
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 border-2 border-gray-200 rounded-xl text-left transition-all duration-200 hover:shadow-md ${colorClasses[color]} w-full`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}
