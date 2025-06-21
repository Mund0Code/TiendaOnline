// src/lib/cartStore.ts - Limitado a 1 artículo por producto
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
  isAddingToCart: boolean;

  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isAddingToCart: false,

      addItem: async (item) => {
        // Prevenir múltiples adiciones
        if (get().isAddingToCart) {
          console.log("⚠️ Ya se está agregando un producto");
          return;
        }

        const items = get().items;
        const exists = items.find((i) => i.id === item.id);

        // Si ya existe, no hacer nada (limitar a 1 por producto)
        if (exists) {
          console.log("⚠️ Este producto ya está en el carrito");
          return;
        }

        set({ isAddingToCart: true });

        try {
          // Pequeña demora para UX
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Solo agregar si no existe (cantidad siempre 1)
          set({
            items: [...items, { ...item, quantity: 1 }],
          });

          console.log(`✅ Producto agregado: ${item.name}`);
        } catch (error) {
          console.error("❌ Error agregando al carrito:", error);
        } finally {
          set({ isAddingToCart: false });
        }
      },

      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),

      // Limitar updateQuantity para que no supere 1
      updateQuantity: (id, qty) => {
        if (qty > 1) {
          console.log("⚠️ Máximo 1 artículo por producto");
          qty = 1;
        }

        if (qty <= 0) {
          get().removeItem(id);
          return;
        }

        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity: qty } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      total: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "myshop-cart",
      getStorage: () => localStorage,
      partialize: (state) => ({ items: state.items }),
    }
  )
);
