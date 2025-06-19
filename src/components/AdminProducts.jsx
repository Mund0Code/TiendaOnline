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
    category_id: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) console.error("Error cargando categorías:", error);
    else setCategories(data);
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        id,
        name,
        price,
        category_id,
        description,
        image_url,
        file_path,
        category:categories!products_category_id_fkey(
          name
        )
      `
      )
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setProducts(data);
    setLoadingProducts(false);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError(null);
  };

  const startAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      price: "",
      image_url: "",
      file_path: "",
      category_id: "",
    });
    setError(null);
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
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Validaciones
    if (!form.name.trim()) {
      setError("El nombre del libro es obligatorio.");
      setSubmitting(false);
      return;
    }

    if (!form.price || parseFloat(form.price) <= 0) {
      setError("El precio debe ser mayor a 0.");
      setSubmitting(false);
      return;
    }

    if (!form.category_id) {
      setError("Debes seleccionar una categoría.");
      setSubmitting(false);
      return;
    }

    if (!form.file_path) {
      setError("Debes subir el PDF del libro.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        image_url: form.image_url.trim(),
        file_path: form.file_path,
        category_id: form.category_id,
      };

      const action = editingId
        ? supabase.from("products").update(payload).eq("id", editingId)
        : supabase.from("products").insert([payload]);

      const { error: err } = await action;

      if (err) {
        setError(err.message);
      } else {
        setShowModal(false);
        await fetchProducts();
        // Limpiar el formulario después de guardar exitosamente
        setForm({
          name: "",
          description: "",
          price: "",
          image_url: "",
          file_path: "",
          category_id: "",
        });
      }
    } catch (err) {
      setError("Error inesperado: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este producto?")) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        setError(error.message);
      } else {
        await fetchProducts();
      }
    } catch (err) {
      setError("Error eliminando el producto: " + err.message);
    }
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea un PDF
    if (file.type !== "application/pdf") {
      setError("Solo se permiten archivos PDF.");
      return;
    }

    // Validar tamaño (ejemplo: max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("El archivo es demasiado grande. Máximo 10MB.");
      return;
    }

    setError(null);
    setUploadingFile(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        setError("Error subiendo archivo: " + data.error);
      } else if (data.path) {
        setForm((f) => ({ ...f, file_path: data.path }));
      } else {
        setError("Respuesta inesperada del servidor.");
      }
    } catch (err) {
      setError("Error subiendo archivo: " + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setError(null);
    // No limpiar el form aquí para que el usuario no pierda los datos si cierra por accidente
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl mb-8 p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📚 Gestión de Productos
              </h1>
              <p className="text-gray-600">
                Administra tu catálogo de libros digitales
              </p>
            </div>
            <button
              onClick={startAdd}
              disabled={submitting || uploadingFile}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Agregar Producto
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-200 px-8 py-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingId ? "✏️ Editar Producto" : "✨ Nuevo Producto"}
                  </h2>
                  <button
                    onClick={closeModal}
                    disabled={submitting || uploadingFile}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 disabled:opacity-50"
                  >
                    <svg
                      className="w-6 h-6 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Nombre */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    <span className="mr-2">📖</span>
                    Nombre del libro *
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100"
                    placeholder="Ej: El arte de programar en JavaScript"
                  />
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    <span className="mr-2">📝</span>
                    Descripción
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="4"
                    disabled={submitting}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none disabled:bg-gray-100"
                    placeholder="Describe brevemente el contenido del libro..."
                  />
                </div>

                {/* Precio y Categoría en fila */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center">
                      <span className="mr-2">💰</span>
                      Precio (€) *
                    </label>
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={form.price}
                      onChange={handleChange}
                      required
                      disabled={submitting}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center">
                      <span className="mr-2">🏷️</span>
                      Categoría *
                    </label>
                    <select
                      name="category_id"
                      value={form.category_id}
                      onChange={handleChange}
                      required
                      disabled={submitting}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100"
                    >
                      <option value="">Selecciona una categoría</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* URL Imagen */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    <span className="mr-2">🖼️</span>
                    URL de la imagen de portada
                  </label>
                  <input
                    name="image_url"
                    type="url"
                    value={form.image_url}
                    onChange={handleChange}
                    disabled={submitting}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100"
                    placeholder="https://ejemplo.com/portada.jpg"
                  />
                </div>

                {/* Subida de archivo */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    <span className="mr-2">📄</span>
                    Archivo PDF del libro *
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors duration-200 ${
                      uploadingFile
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={uploadFile}
                      disabled={submitting || uploadingFile}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className={`${uploadingFile || submitting ? "cursor-not-allowed" : "cursor-pointer"} flex flex-col items-center space-y-2`}
                    >
                      {uploadingFile ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-blue-600 font-medium">
                            Subiendo archivo...
                          </span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <span className="text-sm text-gray-600">
                            Haz clic para subir un archivo PDF (máx. 10MB)
                          </span>
                        </>
                      )}
                    </label>
                    {form.file_path && !uploadingFile && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700 flex items-center">
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Archivo subido: {form.file_path.split("/").pop()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botones */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting || uploadingFile}
                    className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || uploadingFile || !form.file_path}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center">
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </span>
                    ) : editingId ? (
                      "💾 Guardar cambios"
                    ) : (
                      "✨ Crear producto"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de productos */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">
              Lista de productos ({products.length})
            </h3>
          </div>

          {loadingProducts ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Cargando productos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-600 text-lg">No hay productos todavía</p>
              <p className="text-gray-500">
                Agrega tu primer libro para comenzar
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="p-6 hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {p.image_url && (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-16 h-20 object-cover rounded-lg shadow-md flex-shrink-0"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            {p.name}
                          </h4>
                          {p.description && (
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                              {p.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className="flex items-center text-green-600 font-semibold">
                              <span className="mr-1">💰</span>€
                              {Number(p.price).toFixed(2)}
                            </span>
                            <span className="flex items-center text-blue-600">
                              <span className="mr-1">🏷️</span>
                              {p.category?.name ?? "Sin categoría"}
                            </span>
                            {p.file_path && (
                              <span className="flex items-center text-gray-500">
                                <span className="mr-1">📄</span>
                                PDF disponible
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEdit(p)}
                        disabled={submitting || uploadingFile}
                        className="px-4 py-2 bg-amber-100 text-amber-700 font-medium rounded-lg hover:bg-amber-200 transition-colors duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={submitting || uploadingFile}
                        className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
