// src/components/ProductCard.jsx - Para carrito de 1 producto máximo
import React, { useState } from "react";
import { useCartStore } from "../lib/cartStore";

export default function ProductCard({ product }) {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const isAddingToCart = useCartStore((s) => s.isAddingToCart);

  const [justAdded, setJustAdded] = useState(false);
  const [showCartFullMessage, setShowCartFullMessage] = useState(false);

  // Verificar si este producto específico está en carrito
  const isThisProductInCart = items.some((i) => i.id === product.id);

  // Verificar si el carrito ya tiene un producto (diferente a este)
  const hasOtherProduct = items.length > 0 && !isThisProductInCart;

  const handleAdd = async () => {
    // Si ya está agregando, salir
    if (isAddingToCart) return;

    // Si ya hay otro producto en el carrito
    if (hasOtherProduct) {
      setShowCartFullMessage(true);
      setTimeout(() => setShowCartFullMessage(false), 3000);
      return;
    }

    // Si este producto ya está en carrito, no hacer nada
    if (isThisProductInCart) return;

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
  } else if (isThisProductInCart) {
    buttonText = "En el carrito";
    buttonClass = "bg-gray-400 text-gray-200 cursor-not-allowed";
    isDisabled = true;
  } else if (hasOtherProduct) {
    buttonText = "Carrito lleno";
    buttonClass = "bg-orange-400 text-white cursor-not-allowed";
    isDisabled = true;
  }

  return (
    <div className="max-w-sm bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 relative">
      {/* Mensaje de carrito lleno */}
      {showCartFullMessage && (
        <div className="absolute top-2 left-2 right-2 bg-orange-100 border border-orange-300 text-orange-800 px-3 py-2 rounded-lg text-sm z-10">
          <div className="flex items-center">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              ></path>
            </svg>
            <span className="font-medium">Solo 1 producto por carrito</span>
          </div>
        </div>
      )}

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

        {/* Mensaje informativo si hay otro producto */}
        {hasOtherProduct && (
          <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-700">
              <svg
                className="w-3 h-3 inline mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              Ya tienes un producto en el carrito
            </p>
          </div>
        )}

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
          {hasOtherProduct && !isThisProductInCart && (
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
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
              ></path>
            </svg>
          )}
          {buttonText}
        </button>

        {/* Link al carrito si tiene este producto */}
        {isThisProductInCart && (
          <div className="mt-2 text-center">
            <a
              href="/cart"
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
            >
              Ver en carrito →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
