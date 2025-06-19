// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Validación de variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY en las variables de entorno"
  );
}

// Variable global para almacenar la instancia única
let supabaseInstance: SupabaseClient | null = null;

// Clave única de storage basada en la URL para evitar conflictos
const STORAGE_KEY = `supabase.auth.token.${btoa(supabaseUrl).slice(0, 8)}`;

// Función para obtener o crear la instancia única de Supabase
function getSupabaseClient(): SupabaseClient {
  // Verificar si ya existe una instancia en el contexto global
  if (typeof window !== "undefined") {
    // @ts-ignore - Agregar al window para asegurar singularidad global
    if (window.__supabaseClient) {
      return window.__supabaseClient;
    }
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Importante para evitar conflictos en Astro
        storageKey: STORAGE_KEY, // Clave única basada en la URL
        storage:
          typeof window !== "undefined" ? window.localStorage : undefined,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      // Configuración adicional para Astro
      global: {
        headers: {
          "X-Client-Info": "supabase-js-astro",
          "X-Client-Version": "1.0.0",
        },
      },
    });

    // Guardar en el contexto global del navegador
    if (typeof window !== "undefined") {
      // @ts-ignore
      window.__supabaseClient = supabaseInstance;
    }
  }
  return supabaseInstance;
}

// Exportar la instancia única
export const supabase = getSupabaseClient();

// Función para limpiar la instancia (útil para testing o reinicio)
export function resetSupabaseClient(): void {
  supabaseInstance = null;
}

// Tipos para TypeScript
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          category_id: string | null;
          stock: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          category_id?: string | null;
          stock?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          category_id?: string | null;
          stock?: number;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          amount_total: number;
          checkout_session_id: string;
          invoice_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          amount_total: number;
          checkout_session_id: string;
          invoice_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          amount_total?: number;
          checkout_session_id?: string;
          invoice_url?: string | null;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
    };
  };
};

// Cliente tipado
export type TypedSupabaseClient = SupabaseClient<Database>;
