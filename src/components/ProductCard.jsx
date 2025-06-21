// src/components/ProductCard.jsx - Versión segura y simple
import React, { useState } from "react";
import { useCartStore } from "../lib/cartStore";

export default function ProductCard({ product }) {
  // Usar solo lo que necesitamos del store
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const isAddingToCart = useCartStore((s) => s.isAddingToCart);

  const [justAdded, setJustAdded] = useState(false);

  // Verificar si está en carrito (tu lógica original)
  const inCart = items.some((i) => i.id === product.id);

  const handleAdd = async () => {
    // Si ya está agregando o ya está en carrito, no hacer nada
    if (isAddingToCart || inCart) return;

    try {
      await addItem({
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        quantity: 1,
        image_url: product.image_url,
      });

      // Mostrar feedback temporal
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      console.error("Error agregando producto:", error);
    }
  };

  // Determinar estado del botón
  let buttonText = "Añadir al carrito";
  let buttonClass =
    "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300";
  let isDisabled = false;

  if (isAddingToCart) {
    buttonText = "Agregando...";
    buttonClass = "bg-yellow-500 text-white cursor-wait";
    isDisabled = true;
  } else if (justAdded) {
    buttonText = "¡Agregado!";
    buttonClass = "bg-green-500 text-white";
    isDisabled = true;
  } else if (inCart) {
    buttonText = "En el carrito";
    buttonClass = "bg-gray-400 text-gray-200 cursor-not-allowed";
    isDisabled = true;
  }

  return (
    <div className="max-w-sm bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
      {product.image_url && (
        <img
          className="rounded-t-lg h-48 w-full object-cover"
          src={product.image_url}
          alt={product.name}
        />
      )}
      <div className="p-5">
        {/* Categoría como badge */}
        {product.category?.name && (
          <span className="inline-block mb-2 px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded dark:bg-blue-900 dark:text-blue-100">
            {product.category.name}
          </span>
        )}

        <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {product.name}
        </h5>

        <p className="mb-3 font-semibold text-gray-700 dark:text-gray-400">
          €{Number(product.price).toFixed(2)}
        </p>

        <p className="mb-4 text-gray-600 dark:text-gray-300 line-clamp-3">
          {product.description}
        </p>

        <button
          onClick={handleAdd}
          disabled={isDisabled}
          className={`inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ${buttonClass}`}
        >
          {isAddingToCart && (
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          {justAdded && (
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          )}
          {buttonText}
        </button>
      </div>
    </div>
  );
}
