import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    file_path: "",
    category_id: "", // ← añadimos categoría
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Cargar productos y categorías al montar
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // 1) Traer categorías
  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) console.error("Error cargando categorías:", error);
    else setCategories(data);
  };

  // 2) Traer productos con join a categoría
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        id,
        name,
        price,
        category_id,
        category:categories!products_category_id_fkey(
      name
    )
      `
      )
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setProducts(data);
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const startAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      price: "",
      image_url: "",
      file_path: "",
      category_id: "", // reseteamos también
    });
    setShowModal(true);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || "",
      price: p.price,
      image_url: p.image_url || "",
      file_path: p.file_path || "",
      category_id: p.category_id || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.file_path) {
      setError("Debes subir el PDF del libro.");
      return;
    }
    if (!form.category_id) {
      setError("Debes seleccionar una categoría.");
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      image_url: form.image_url,
      file_path: form.file_path,
      category_id: form.category_id, // incluimos aquí
    };

    const action = editingId
      ? supabase.from("products").update(payload).eq("id", editingId)
      : supabase.from("products").insert([payload]);

    const { error: err } = await action;
    if (err) setError(err.message);
    else {
      setShowModal(false);
      fetchProducts();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) setError(error.message);
    else fetchProducts();
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { path, error: uploadErr } = await res.json();
    if (uploadErr) setError("Error subiendo: " + uploadErr);
    else setForm((f) => ({ ...f, file_path: path }));
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gestión de Productos</h1>
      <button
        onClick={startAdd}
        className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
      >
        Agregar Producto
      </button>
      {error && <p className="text-red-600">{error}</p>}

      {showModal && (
        <div className="fixed inset-0 bg-black opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <span className="sr-only">Cerrar</span>✕
            </button>

            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-xl font-semibold">
                {editingId ? "Editar" : "Añadir"} Producto
              </h2>

              {/* Nombre */}
              <div>
                <label className="block mb-1">Nombre</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block mb-1">Descripción</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Precio */}
              <div>
                <label className="block mb-1">Precio (€)</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block mb-1">Categoría</label>
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">--Selecciona--</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* URL Imagen */}
              <div>
                <label className="block mb-1">URL Imagen</label>
                <input
                  name="image_url"
                  value={form.image_url}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Subida PDF */}
              <div>
                <label className="block mb-1">Archivo (PDF)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={uploadFile}
                  className="w-full"
                />
                {form.file_path && (
                  <p className="text-sm text-green-600">
                    Subido: {form.file_path}
                  </p>
                )}
              </div>

              {/* Botón enviar */}
              <div className="text-right">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  {editingId ? "Guardar cambios" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de productos */}
      <ul className="space-y-2">
        {products.map((p) => (
          <li
            key={p.id}
            className="p-4 bg-white rounded shadow flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-gray-600">
                €{Number(p.price).toFixed(2)} —{" "}
                <span className="italic text-gray-500">
                  {p.category?.name ?? "Sin categoría"}
                </span>
              </p>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => startEdit(p)}
                className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
