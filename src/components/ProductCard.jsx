// src/components/ProductCard.jsx - Versión corregida sin hooks problemáticos
import React, { useState } from "react";
import { useCartStore } from "../lib/cartStore";

export default function ProductCard({ product }) {
  // Usar solo el hook principal del store
  const { items, addItem, isAddingToCart, isItemInCart, getItemQuantity } =
    useCartStore((state) => ({
      items: state.items,
      addItem: state.addItem,
      isAddingToCart: state.isAddingToCart,
      isItemInCart: state.isItemInCart,
      getItemQuantity: state.getItemQuantity,
    }));

  const [justAdded, setJustAdded] = useState(false);
  const [error, setError] = useState(null);

  // Calcular si está en carrito y cantidad
  const isInCart = isItemInCart(product.id);
  const quantity = getItemQuantity(product.id);

  const handleAdd = async () => {
    // Evitar doble click o si ya está en proceso
    if (isAddingToCart || isInCart) return;

    try {
      setError(null);

      await addItem({
        id: product.id,
        name: product.name,
        description: product.description || "",
        price: Number(product.price),
        quantity: 1,
        image_url: product.image_url,
      });

      // Mostrar feedback visual temporal
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      console.error("Error agregando producto:", error);
      setError("Error al agregar el producto");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Determinar el estado del botón
  const getButtonState = () => {
    if (error) {
      return {
        disabled: false,
        text: "Reintentar",
        className: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-300",
        icon: "retry",
      };
    }

    if (isAddingToCart) {
      return {
        disabled: true,
        text: "Agregando...",
        className: "bg-yellow-500 text-white cursor-wait",
        icon: "loading",
      };
    }

    if (justAdded) {
      return {
        disabled: true,
        text: "¡Agregado!",
        className: "bg-green-500 text-white cursor-default",
        icon: "check",
      };
    }

    if (isInCart) {
      return {
        disabled: true,
        text: `En carrito (${quantity})`,
        className: "bg-gray-400 text-gray-200 cursor-not-allowed",
        icon: "cart",
      };
    }

    return {
      disabled: false,
      text: "Añadir al carrito",
      className:
        "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300 transform hover:scale-105",
      icon: "plus",
    };
  };

  const buttonState = getButtonState();

  const renderIcon = () => {
    switch (buttonState.icon) {
      case "loading":
        return (
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
        );
      case "check":
        return (
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
        );
      case "cart":
        return (
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
              d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6m-8 0V9a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h4"
            ></path>
          </svg>
        );
      case "retry":
        return (
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            ></path>
          </svg>
        );
      default:
        return (
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
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            ></path>
          </svg>
        );
    }
  };

  return (
    <div className="max-w-sm bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 dark:bg-gray-800 dark:border-gray-700">
      {/* Imagen del producto */}
      <div className="relative overflow-hidden rounded-t-lg">
        {product.image_url ? (
          <img
            className="h-48 w-full object-cover transition-transform duration-300 hover:scale-110"
            src={product.image_url}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              ></path>
            </svg>
          </div>
        )}

        {/* Badges */}
        {justAdded && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold animate-pulse">
            ¡Agregado!
          </div>
        )}

        {error && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            Error
          </div>
        )}

        {isInCart && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            En carrito
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Categoría como badge */}
        {product.category?.name && (
          <span className="inline-block mb-3 px-3 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-100">
            {product.category.name}
          </span>
        )}

        {/* Título del producto */}
        <h5
          className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white line-clamp-2"
          title={product.name}
        >
          {product.name}
        </h5>

        {/* Precio */}
        <div className="mb-3">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            €{Number(product.price).toFixed(2)}
          </span>
          {/* Mostrar precio total si hay cantidad > 1 */}
          {isInCart && quantity > 1 && (
            <span className="ml-2 text-sm text-gray-600">
              (Total: €{(Number(product.price) * quantity).toFixed(2)})
            </span>
          )}
        </div>

        {/* Descripción */}
        <p
          className="mb-4 text-gray-600 dark:text-gray-300 text-sm line-clamp-3"
          title={product.description}
        >
          {product.description || "Descripción no disponible"}
        </p>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Botón de agregar al carrito */}
        <button
          onClick={handleAdd}
          disabled={buttonState.disabled}
          className={`
            inline-flex items-center justify-center w-full px-4 py-3 text-sm font-medium rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200
            disabled:cursor-not-allowed
            ${buttonState.className}
          `}
          aria-label={buttonState.text}
          title={buttonState.text}
        >
          {renderIcon()}
          {buttonState.text}
        </button>

        {/* Información adicional */}
        {isInCart && quantity > 0 && (
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>Cantidad: {quantity}</span>
            <a
              href="/cart"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Ver carrito
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
