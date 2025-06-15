// src/components/Sidebar.jsx
import React from "react";

export default function Sidebar({ id, items, activeKey, onSelect }) {
  return (
    <aside
      id={id}
      className="fixed top-0 left-0 z-40 w-64 h-screen pt-4 transition-transform -translate-x-full sm:translate-x-0 bg-gray-50 dark:bg-gray-800 overflow-y-auto"
      aria-label="Sidebar"
    >
      <div className="px-4 pb-4">
        <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-200">
          Panel Admin
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Gestiona tu tienda
        </p>
        <nav className="space-y-1">
          {Object.entries(items).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`w-full flex items-center px-4 py-2 rounded-md text-left focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                key === activeKey
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
