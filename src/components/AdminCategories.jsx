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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gestión de Categorías</h1>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Nombre de la categoría"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {editingId ? "Guardar" : "Agregar"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setName("");
              setError(null);
            }}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancelar
          </button>
        )}
      </form>
      {error && <p className="text-red-600">{error}</p>}

      {/* Lista */}
      {categories.length === 0 ? (
        <p className="text-gray-600">No hay categorías.</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex justify-between items-center bg-white p-3 rounded shadow"
            >
              <span>{c.name}</span>
              <div className="space-x-2">
                <button
                  onClick={() => startEdit(c)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
