// src/lib/cartStore.ts - Versión mejorada con loading y mejor UX
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
  isUpdatingCart: boolean;

  // Acciones principales
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => Promise<void>;
  clearCart: () => void;

  // Getters útiles
  total: () => number;
  totalItems: () => number;
  isItemInCart: (id: string) => boolean;
  getItemQuantity: (id: string) => number;
  getItem: (id: string) => CartItem | undefined;

  // Acciones de estado
  setAddingToCart: (isAdding: boolean) => void;
  setUpdatingCart: (isUpdating: boolean) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isAddingToCart: false,
      isUpdatingCart: false,

      // Agregar item con loading state
      addItem: async (item: CartItem) => {
        // Prevenir múltiples operaciones simultáneas
        if (get().isAddingToCart) {
          console.log("⚠️ Ya se está agregando un producto al carrito");
          return;
        }

        set({ isAddingToCart: true });

        try {
          // Simular pequeña demora para mejor UX
          await new Promise((resolve) => setTimeout(resolve, 300));

          const items = get().items;
          const existingItem = items.find((i) => i.id === item.id);

          if (existingItem) {
            // Si ya existe, incrementar cantidad
            set({
              items: items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity + (item.quantity || 1) }
                  : i
              ),
            });
            console.log(`✅ Cantidad actualizada para: ${item.name}`);
          } else {
            // Si no existe, agregar nuevo
            set({
              items: [...items, { ...item, quantity: item.quantity || 1 }],
            });
            console.log(`✅ Producto agregado al carrito: ${item.name}`);
          }
        } catch (error) {
          console.error("❌ Error agregando al carrito:", error);
          throw error; // Re-lanzar para que el componente pueda manejarlo
        } finally {
          set({ isAddingToCart: false });
        }
      },

      // Remover item
      removeItem: (id: string) => {
        const item = get().getItem(id);
        set({
          items: get().items.filter((i) => i.id !== id),
        });
        console.log(`🗑️ Producto eliminado del carrito: ${item?.name || id}`);
      },

      // Actualizar cantidad con loading state
      updateQuantity: async (id: string, qty: number) => {
        if (qty < 0) {
          console.warn("⚠️ Cantidad no puede ser negativa");
          return;
        }

        if (qty === 0) {
          get().removeItem(id);
          return;
        }

        set({ isUpdatingCart: true });

        try {
          // Pequeña demora para feedback visual
          await new Promise((resolve) => setTimeout(resolve, 200));

          set({
            items: get().items.map((i) =>
              i.id === id ? { ...i, quantity: qty } : i
            ),
          });

          const item = get().getItem(id);
          console.log(`🔄 Cantidad actualizada: ${item?.name} -> ${qty}`);
        } catch (error) {
          console.error("❌ Error actualizando cantidad:", error);
          throw error;
        } finally {
          set({ isUpdatingCart: false });
        }
      },

      // Limpiar carrito
      clearCart: () => {
        const itemCount = get().totalItems();
        set({ items: [] });
        console.log(`🧹 Carrito vaciado (${itemCount} productos eliminados)`);
      },

      // Getters útiles
      total: () => {
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      },

      totalItems: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      isItemInCart: (id: string) => {
        return get().items.some((item) => item.id === id);
      },

      getItemQuantity: (id: string) => {
        const item = get().items.find((i) => i.id === id);
        return item?.quantity || 0;
      },

      getItem: (id: string) => {
        return get().items.find((i) => i.id === id);
      },

      // Acciones de estado
      setAddingToCart: (isAdding: boolean) => {
        set({ isAddingToCart: isAdding });
      },

      setUpdatingCart: (isUpdating: boolean) => {
        set({ isUpdatingCart: isUpdating });
      },
    }),
    {
      name: "myshop-cart",
      getStorage: () => localStorage,
      // Solo persistir items, no los estados de loading
      partialize: (state) => ({
        items: state.items,
      }),
      // Versión para manejar migraciones futuras
      version: 1,
      // Función de migración si cambias la estructura
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migrar de versión antigua si es necesario
          return {
            items: persistedState.items || [],
          };
        }
        return persistedState as CartState;
      },
    }
  )
);

// Hooks personalizados para casos de uso específicos
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartTotal = () => useCartStore((state) => state.total());
export const useCartTotalItems = () =>
  useCartStore((state) => state.totalItems());
export const useCartLoading = () =>
  useCartStore((state) => ({
    isAddingToCart: state.isAddingToCart,
    isUpdatingCart: state.isUpdatingCart,
  }));

// Selector para verificar si un producto específico está en el carrito
export const useIsItemInCart = (id: string) =>
  useCartStore((state) => state.isItemInCart(id));

// Selector para obtener la cantidad de un producto específico
export const useItemQuantity = (id: string) =>
  useCartStore((state) => state.getItemQuantity(id));

// Tipos de utilidad para componentes
export type CartActions = Pick<
  CartState,
  "addItem" | "removeItem" | "updateQuantity" | "clearCart"
>;

export type CartGetters = Pick<
  CartState,
  "total" | "totalItems" | "isItemInCart" | "getItemQuantity" | "getItem"
>;
