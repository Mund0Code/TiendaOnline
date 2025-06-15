import { useState, useEffect } from "react";
import { useCartStore } from "../lib/cartStore";
import { supabase } from "../lib/supabaseClient";

export default function CheckoutForm() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUserId(data.session.user.id);
    });
  }, []);

  const handleCheckout = async () => {
    if (!userId) {
      setError("Debes iniciar sesión para pagar.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, customerId: userId }),
      });
      const { url, error: e } = await res.json();
      if (e) throw new Error(e);
      clearCart();
      window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const total = items
    .reduce((sum, i) => sum + i.price * i.quantity, 0)
    .toFixed(2);

  if (items.length === 0) {
    return <p>Tu carrito está vacío.</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between">
            {i.quantity} × {i.name}
            <span>€{(i.price * i.quantity).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <p className="text-lg font-semibold">Total: €{total}</p>
      {error && <p className="text-red-600">{error}</p>}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Procesando…" : "Pagar con Stripe"}
      </button>
    </div>
  );
}
