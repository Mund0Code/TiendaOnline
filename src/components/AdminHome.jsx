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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);

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
        ordersData.data?.reduce((sum, o) => sum + Number(o.amount_total), 0) ||
        0;

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
      setLoading(false);
    };

    loadDashboardData();
  }, []);

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
          <h3 className="text-xl font-bold text-gray-800 mb-6">
            Actividad Reciente
          </h3>
          <div className="space-y-4">
            <ActivityItem
              icon="🛒"
              title="Nuevo pedido recibido"
              description="Pedido #1234 por €45.99"
              time="Hace 2 minutos"
              color="green"
            />
            <ActivityItem
              icon="👤"
              title="Nuevo cliente registrado"
              description="maria.garcia@email.com"
              time="Hace 15 minutos"
              color="blue"
            />
            <ActivityItem
              icon="📦"
              title="Producto actualizado"
              description="JavaScript Avanzado - Precio modificado"
              time="Hace 1 hora"
              color="orange"
            />
            <ActivityItem
              icon="💬"
              title="Mensaje de soporte"
              description="Nueva consulta sobre envíos"
              time="Hace 2 horas"
              color="purple"
            />
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
          />
          <QuickActionButton
            icon="📊"
            title="Ver Analíticas"
            description="Revisar métricas detalladas"
            color="purple"
          />
          <QuickActionButton
            icon="📦"
            title="Gestionar Pedidos"
            description="Procesar pedidos pendientes"
            color="green"
          />
          <QuickActionButton
            icon="💬"
            title="Soporte"
            description="Responder consultas"
            color="orange"
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
        className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  );
}

function QuickActionButton({ icon, title, description, color }) {
  const colorClasses = {
    blue: "hover:bg-blue-50 hover:border-blue-200",
    purple: "hover:bg-purple-50 hover:border-purple-200",
    green: "hover:bg-green-50 hover:border-green-200",
    orange: "hover:bg-orange-50 hover:border-orange-200",
  };

  return (
    <button
      className={`p-4 border-2 border-gray-200 rounded-xl text-left transition-all duration-200 hover:shadow-md ${colorClasses[color]}`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}
