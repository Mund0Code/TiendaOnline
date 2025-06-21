// src/lib/cartStore.ts - Versión segura basada en tu código original
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface CartState {
  items: CartItem[];
  isAddingToCart: boolean; // Solo agregamos este estado

  addItem: (item: CartItem) => Promise<void>; // Hacemos async solo este método
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isAddingToCart: false, // Estado inicial

      // Solo modificamos addItem para que sea async
      addItem: async (item) => {
        // Prevenir múltiples adiciones
        if (get().isAddingToCart) {
          console.log("⚠️ Ya se está agregando un producto");
          return;
        }

        set({ isAddingToCart: true });

        try {
          // Pequeña demora para UX
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Tu lógica original
          const items = get().items;
          const exists = items.find((i) => i.id === item.id);
          if (exists) {
            set({
              items: items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            });
          } else {
            set({ items: [...items, item] });
          }

          console.log(`✅ Producto agregado: ${item.name}`);
        } catch (error) {
          console.error("❌ Error agregando al carrito:", error);
        } finally {
          set({ isAddingToCart: false });
        }
      },

      // Mantener tus métodos originales sin cambios
      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),

      updateQuantity: (id, qty) =>
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity: qty } : i
          ),
        }),

      clearCart: () => set({ items: [] }),

      total: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "myshop-cart",
      getStorage: () => localStorage,
      // Solo persistir items, no el estado de loading
      partialize: (state) => ({ items: state.items }),
    }
  )
);
