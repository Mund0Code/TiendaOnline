// src/lib/cartStore.ts - Solo 1 producto total en el carrito
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

        // Si ya hay un producto en el carrito, no agregar más
        if (items.length >= 1) {
          console.log("⚠️ Solo se permite 1 producto en el carrito");
          return;
        }

        set({ isAddingToCart: true });

        try {
          // Pequeña demora para UX
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Agregar el producto (siempre será el único)
          set({
            items: [{ ...item, quantity: 1 }],
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

      updateQuantity: (id, qty) => {
        if (qty <= 0) {
          get().removeItem(id);
          return;
        }

        // Permitir cambiar cantidad del único producto
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
