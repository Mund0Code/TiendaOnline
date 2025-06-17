// src/components/Cart.jsx
import React from "react";
import { useCartStore } from "../lib/cartStore";

export default function Cart() {
  // Esta línea sólo corre en el cliente porque Astro hidra con client:load
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="p-6 text-center mt-24">
        <p className="text-lg">Tu carrito está vacío.</p>
        <a
          href="/"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Volver a la tienda
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-28 p-6 space-y-6">
      <h1 className="text-2xl font-bold">Carrito de la compra</h1>
      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col sm:flex-row items-center sm:justify-between bg-white rounded shadow p-4"
          >
            <div className="flex items-center space-x-4 flex-grow">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-500">No img</span>
                </div>
              )}
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-gray-600">
                  €{item.price.toFixed(2)} × {item.quantity} = €
                  {(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateQty(item.id, Number(e.target.value))}
                className="w-16 border rounded px-2 py-1"
              />
              <button
                onClick={() => removeItem(item.id)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row justify-between items-center bg-white rounded shadow p-4">
        <p className="text-xl font-semibold">Total: €{total.toFixed(2)}</p>
        <div className="space-x-2 mt-4 sm:mt-0">
          <button
            onClick={clearCart}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Vaciar carrito
          </button>
          <a
            href="/checkout"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Proceder al pago
          </a>
        </div>
      </div>
    </div>
  );
}
