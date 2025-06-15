import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ClientDashboard() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = "/login";
      } else {
        setSession(data.session);
      }
    });
  }, []);

  if (!session) {
    return <p className="p-6">Comprobando sesión…</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">¡Hola, {session.user.email}!</h1>
      <p className="mt-4">
        Aquí podrás ver tu historial de pedidos y gestionar tu perfil.
      </p>
      {/* Más componentes según necesidades */}
    </div>
  );
}
