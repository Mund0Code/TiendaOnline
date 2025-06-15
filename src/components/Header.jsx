import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useCartStore } from "../lib/cartStore";

export default function Header() {
  const [session, setSession] = useState(null);
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_, ses) =>
      setSession(ses)
    );
    return () => listener.unsubscribe();
  }, []);

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <a href="/" className="text-xl font-bold">
          MyShop
        </a>
        <nav className="space-x-4">
          <a href="/">Inicio</a>
          <a href="/categorias" className="hover:underline">
            Categorías
          </a>

          <a href="/cart">Carrito ({cartCount})</a>
          {session ? (
            <>
              <a href="/profile">Perfil</a>
              <button
                onClick={() =>
                  supabase.auth.signOut().then(() => window.location.reload())
                }
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <a href="/login">Login</a>
          )}
        </nav>
      </div>
    </header>
  );
}
