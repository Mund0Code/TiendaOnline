// src/components/ProductCard.jsx
import React from "react";
import { useCartStore } from "../lib/cartStore";

export default function ProductCard({ product }) {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);

  const inCart = items.some((i) => i.id === product.id);

  const handleAdd = () => {
    addItem({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      quantity: 1,
      image_url: product.image_url,
    });
  };

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
          disabled={inCart}
          className={`inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            inCart
              ? "bg-gray-400 text-gray-200 cursor-not-allowed focus:ring-gray-300"
              : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300"
          }`}
        >
          {inCart ? "En el carrito" : "Añadir al carrito"}
        </button>
      </div>
    </div>
  );
}
