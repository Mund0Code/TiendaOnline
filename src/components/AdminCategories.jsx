// src/components/AdminCategories.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // 1) Carga inicial
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) setError(error.message);
    else {
      setCategories(data);
      setError(null);
    }
  };

  // 2) Añadir o editar
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    setLoading(true);

    let res;
    if (editingId) {
      res = await supabase
        .from("categories")
        .update({ name })
        .eq("id", editingId);
    } else {
      res = await supabase.from("categories").insert([{ name }]);
    }

    if (res.error) {
      setError(res.error.message);
    } else {
      setName("");
      setEditingId(null);
      fetchCategories();
    }
    setLoading(false);
  };

  // 3) Prepara edición
  const startEdit = (cat) => {
    setEditingId(cat.id);
    setName(cat.name);
  };

  // 4) Eliminar
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) setError(error.message);
    else fetchCategories();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🗂️ Gestión de Categorías
          </h1>
          <p className="text-gray-600 text-lg">
            Organiza tus productos por categorías
          </p>
        </div>

        {/* Formulario Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">
              {editingId ? "✏️ Editar Categoría" : "➕ Nueva Categoría"}
            </h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Nombre de la categoría..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-500 focus:ring-purple-500 focus:ring-2 focus:ring-opacity-20 transition-all duration-200 text-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Guardando...
                      </div>
                    ) : editingId ? (
                      "💾 Guardar"
                    ) : (
                      "✨ Agregar"
                    )}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setName("");
                        setError(null);
                      }}
                      className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-300 transition-all duration-200 font-medium"
                    >
                      ❌ Cancelar
                    </button>
                  )}
                </div>
              </div>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 flex items-center gap-2">
                  <span>⚠️</span>
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Categorías */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                📋 Categorías Existentes
              </h2>
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-black text-sm font-medium">
                {categories.length} categorías
              </span>
            </div>
          </div>
          <div className="p-6">
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-500 text-lg font-medium">
                  No hay categorías creadas
                </p>
                <p className="text-gray-400 text-sm">
                  Agrega tu primera categoría para comenzar
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="group flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 border border-gray-200 hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-lg font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">
                        {c.name}
                      </span>
                    </div>
                    <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(c)}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
