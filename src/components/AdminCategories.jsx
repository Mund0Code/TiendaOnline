// src/components/AdminCategories.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    slug: "",
    is_active: true,
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showInactive, setShowInactive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // 1) Carga inicial
  useEffect(() => {
    fetchCategories();
  }, []);

  // 2) Filtrado y búsqueda
  useEffect(() => {
    let filtered = categories.filter((category) => {
      const matchesSearch =
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.description &&
          category.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()));
      const matchesActive = showInactive || category.is_active;
      return matchesSearch && matchesActive;
    });

    // Ordenamiento
    filtered.sort((a, b) => {
      const aValue = a[sortBy] || "";
      const bValue = b[sortBy] || "";

      if (sortOrder === "asc") {
        return aValue.toString().localeCompare(bValue.toString());
      } else {
        return bValue.toString().localeCompare(aValue.toString());
      }
    });

    setFilteredCategories(filtered);
  }, [categories, searchTerm, sortBy, sortOrder, showInactive]);

  // 3) Generar slug automático
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, description, slug, is_active, created_at")
        .order("name", { ascending: true });

      if (error) throw error;

      setCategories(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4) Limpiar mensajes
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // 5) Manejar cambios en el formulario
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generar slug cuando cambia el nombre
    if (field === "name" && !editingId) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(value),
      }));
    }

    clearMessages();
  };

  // 6) Validaciones
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("El nombre es obligatorio");
      return false;
    }

    if (formData.name.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return false;
    }

    if (formData.name.length > 50) {
      setError("El nombre no puede exceder 50 caracteres");
      return false;
    }

    if (formData.description && formData.description.length > 200) {
      setError("La descripción no puede exceder 200 caracteres");
      return false;
    }

    // Verificar slug único
    const existingSlug = categories.find(
      (cat) => cat.slug === formData.slug && cat.id !== editingId
    );
    if (existingSlug) {
      setError("Ya existe una categoría con este slug");
      return false;
    }

    return true;
  };

  // 7) Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        slug: formData.slug.trim(),
        is_active: formData.is_active,
      };

      let result;
      if (editingId) {
        result = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editingId);
      } else {
        result = await supabase.from("categories").insert([categoryData]);
      }

      if (result.error) throw result.error;

      setSuccess(
        editingId
          ? "Categoría actualizada correctamente"
          : "Categoría creada correctamente"
      );
      resetForm();
      fetchCategories();

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 8) Preparar edición
  const startEdit = (category) => {
    setFormData({
      name: category.name,
      description: category.description || "",
      slug: category.slug || generateSlug(category.name),
      is_active: category.is_active ?? true,
    });
    setEditingId(category.id);
    clearMessages();
  };

  // 9) Resetear formulario
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      slug: "",
      is_active: true,
    });
    setEditingId(null);
    clearMessages();
  };

  // 10) Alternar estado activo/inactivo
  const toggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setSuccess(
        `Categoría ${!currentStatus ? "activada" : "desactivada"} correctamente`
      );
      fetchCategories();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // 11) Eliminar categoría
  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;

      setSuccess("Categoría eliminada correctamente");
      setDeleteConfirm(null);
      fetchCategories();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando categorías...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Gestión de Categorías
              </h1>
              <p className="text-blue-100">
                Organiza y administra las categorías de productos
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
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
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total categorías</p>
                  <p className="text-xl font-bold text-gray-900">
                    {categories.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Activas</p>
                  <p className="text-xl font-bold text-gray-900">
                    {categories.filter((c) => c.is_active).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg mr-3">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 21l-4.95-4.95m0 0L5.636 5.636M13.05 16.05L5.636 5.636"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Inactivas</p>
                  <p className="text-xl font-bold text-gray-900">
                    {categories.filter((c) => !c.is_active).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg
              className="h-5 w-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg
              className="h-5 w-5 text-green-600"
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
            <p className="text-green-700 font-medium">{success}</p>
          </div>
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {editingId ? "Editar categoría" : "Nueva categoría"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Ej: Electrónicos"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.name.length}/50 caracteres
              </p>
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange("slug", e.target.value)}
                placeholder="ej: electronicos"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL amigable (se genera automáticamente)
              </p>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Descripción opcional de la categoría..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/200 caracteres
            </p>
          </div>

          {/* Estado activo */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleInputChange("is_active", e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="is_active"
              className="text-sm font-medium text-gray-700"
            >
              Categoría activa
            </label>
            <span className="text-xs text-gray-500">
              (Las categorías inactivas no se muestran en la tienda)
            </span>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`
                flex-1 sm:flex-none px-6 py-3 rounded-lg font-medium transition-colors
                ${
                  loading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                }
              `}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{editingId ? "Guardando..." : "Creando..."}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>
                    {editingId ? "Guardar cambios" : "Crear categoría"}
                  </span>
                </div>
              )}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Controles de filtrado */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Búsqueda */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar categorías..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtros y ordenamiento */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Mostrar inactivas */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Mostrar inactivas</span>
            </label>

            {/* Ordenar por */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="name">Ordenar por nombre</option>
              <option value="created_at">Ordenar por fecha</option>
            </select>

            {/* Orden */}
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title={`Ordenar ${sortOrder === "asc" ? "descendente" : "ascendente"}`}
            >
              <svg
                className={`w-4 h-4 text-gray-600 transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 11l5-5m0 0l5 5m-5-5v12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de categorías */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">
            Categorías ({filteredCategories.length})
          </h3>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
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
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm
                ? "No se encontraron categorías"
                : "No hay categorías"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? "Intenta con otros términos de búsqueda"
                : "Comienza creando tu primera categoría"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900 truncate">
                        {category.name}
                      </h4>
                      <span
                        className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${
                          category.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      `}
                      >
                        {category.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    {category.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {category.description}
                      </p>
                    )}

                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Slug: {category.slug}</span>
                      {category.created_at && (
                        <span>
                          Creada:{" "}
                          {new Date(category.created_at).toLocaleDateString(
                            "es-ES"
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {/* Toggle activo/inactivo */}
                    <button
                      onClick={() =>
                        toggleActive(category.id, category.is_active)
                      }
                      className={`
                        px-3 py-1 rounded-lg text-sm font-medium transition-colors
                        ${
                          category.is_active
                            ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }
                      `}
                      title={category.is_active ? "Desactivar" : "Activar"}
                    >
                      {category.is_active ? "Desactivar" : "Activar"}
                    </button>

                    {/* Editar */}
                    <button
                      onClick={() => startEdit(category)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                      title="Editar categoría"
                    >
                      Editar
                    </button>

                    {/* Eliminar */}
                    <button
                      onClick={() => setDeleteConfirm(category.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                      title="Eliminar categoría"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar eliminación
              </h3>
            </div>

            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que quieres eliminar esta categoría? Esta acción
              no se puede deshacer.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
