import React, { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';
import { useAuth } from './AuthContext';
import { addToServerCart, clearServerCart, fetchServerCart, removeFromServerCart } from '../services/cart';
import { fetchProductById } from '../services/products';
import { getFirstImageUrl } from '../utils/imageUtils';

export type CartItem = {
  cartItemId?: number;
  productId: number | string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string | null;
  basePrice?: number;
  discountPrice?: number;
  b2bPrice?: number;
  isB2b?: boolean;
  isBoth?: boolean;
  stockQuantity?: number;
  minQuantity?: number;
  weight?: string;
  purity?: string;
  description?: string;
};

function resolveCartImage(item: any, product: any = null): string | undefined {
  return (
    item?.image ||
    item?.imageUrl ||
    item?.productImage ||
    getFirstImageUrl(item) ||
    getFirstImageUrl(product) ||
    undefined
  );
}

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  addItem: (item: CartItem) => void;
  updateQty: (productId: CartItem['productId'], quantity: number) => void;
  removeItem: (productId: CartItem['productId']) => void;
  clearCart: () => Promise<void>;
  replaceItems: (items: CartItem[]) => void;
  hydrateFromServerCart: (items: Array<{ cartItemId?: number; productId: number | string; quantity: number; price: number; name?: string; image?: string; size?: string | null }>) => void;
};

const STORAGE_KEY = '@jwellery_guest_cart';
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { user, isAuthenticated } = useAuth();
  const syncedUserRef = useRef<number | null>(null);
  const syncQueueRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((next: CartItem[]) => {
    startTransition(() => {
      setItems(next);
    });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const scheduleSync = useCallback((task: () => void) => {
    if (syncQueueRef.current) clearTimeout(syncQueueRef.current);
    syncQueueRef.current = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        task();
      });
    }, 0);
  }, []);

  const hydrateFromServerCart = useCallback((serverItems: Array<{ cartItemId?: number; productId: number | string; quantity: number; price: number; name?: string; image?: string; size?: string | null }>) => {
    const next = serverItems.map(item => ({
      cartItemId: item.cartItemId,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      name: item.name || `Item ${item.productId}`,
      image: resolveCartImage(item),
      size: item.size,
    }));
    persist(next);
  }, [persist]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    });
  }, []);

  useEffect(() => {
    const sync = async () => {
      if (!isAuthenticated || !user) {
        syncedUserRef.current = null;
        return;
      }
      if (syncedUserRef.current === user.id) return;

      // Migrate any guest cart items to server first
      if (items.length > 0) {
        await Promise.allSettled(
          items.map(item =>
            addToServerCart({
              userId: user.id,
              productId: Number(item.productId),
              quantity: item.quantity,
              size: item.size || null,
            }),
          ),
        );
      }

      // Then fetch the merged server cart
      const serverCart = await fetchServerCart(user.id);
      const serverItems = serverCart?.data?.items || [];
      if (Array.isArray(serverItems) && serverItems.length) {
        const enrichedItems = await Promise.all(
          serverItems.map(async (item: any) => {
            const baseItem = {
              cartItemId: item.id ?? item.cartItemId ?? item.itemId,
              productId: item.productId,
              quantity: item.quantity,
              price: Number(item.price || item.subtotal || 0),
              name: item.name || item.productName || `Item ${item.productId}`,
              image: resolveCartImage(item),
              size: item.size || null,
            };

            if (baseItem.image) return baseItem;

            const productRes = await fetchProductById(Number(item.productId)).catch(() => null);
            const product = productRes?.data;
            return {
              ...baseItem,
              image: resolveCartImage(item, product),
              name: baseItem.name || product?.name || `Item ${item.productId}`,
              price: baseItem.price || Number(product?.basePrice || 0) - Number(product?.discountPrice || 0),
            };
          }),
        );

        await hydrateFromServerCart(enrichedItems);
      }
      syncedUserRef.current = user.id;
    };

    sync().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, hydrateFromServerCart]);

  const addItem = useCallback((item: CartItem) => {
    const existing = items.find(i => i.productId === item.productId);
    const next = existing
      ? items.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity, image: i.image || item.image } : i)
      : [...items, { ...item, image: item.image || undefined }];
    persist(next);

    if (isAuthenticated && user) {
      scheduleSync(() => {
        addToServerCart({
          userId: user.id,
          productId: Number(item.productId),
          quantity: item.quantity,
          size: item.size || null,
        }).catch(() => {});
      });
    }
  }, [items, persist, scheduleSync, isAuthenticated, user]);

  const updateQty = useCallback((productId: CartItem['productId'], quantity: number) => {
    const target = items.find(i => i.productId === productId);
    const next = items.map(i => (i.productId === productId ? { ...i, quantity } : i));
    persist(next);

    if (!isAuthenticated || !user || !target) return;
    const currentQty = target.quantity;
    if (quantity === currentQty) return;

    scheduleSync(() => {
      const sync = async () => {
        if (quantity > currentQty) {
          await addToServerCart({
            userId: user.id,
            productId: Number(productId),
            quantity: quantity - currentQty,
            size: target.size || null,
          }).catch(() => {});
        } else if (target.cartItemId) {
          await removeFromServerCart(target.cartItemId).catch(() => {});
          if (quantity > 0) {
            await addToServerCart({
              userId: user.id,
              productId: Number(productId),
              quantity,
              size: target.size || null,
            }).catch(() => {});
          }
        }

        const latest = await fetchServerCart(user.id).catch(() => null);
        const serverItems = latest?.data?.items || [];
        if (!Array.isArray(serverItems) || serverItems.length === 0) return;

        const enrichedItems = await Promise.all(
          serverItems.map(async (item: any) => {
            const baseItem = {
              cartItemId: item.id ?? item.cartItemId ?? item.itemId,
              productId: item.productId,
              quantity: item.quantity,
              price: Number(item.price || item.subtotal || 0),
              name: item.name || item.productName || `Item ${item.productId}`,
              image: resolveCartImage(item),
              size: item.size || null,
            };

            if (baseItem.image) return baseItem;

            const productRes = await fetchProductById(Number(item.productId)).catch(() => null);
            const product = productRes?.data;
            return {
              ...baseItem,
              image: resolveCartImage(item, product),
              name: baseItem.name || product?.name || `Item ${item.productId}`,
              price: baseItem.price || Number(product?.basePrice || 0) - Number(product?.discountPrice || 0),
            };
          }),
        );
        await hydrateFromServerCart(enrichedItems);
      };

      Promise.resolve(sync()).catch(() => {});
    });
  }, [items, persist, scheduleSync, isAuthenticated, user, hydrateFromServerCart]);

  const removeItem = useCallback((productId: CartItem['productId']) => {
    const target = items.find(i => i.productId === productId);
    const next = items.filter(i => i.productId !== productId);
    persist(next);
    if (isAuthenticated && user && target?.cartItemId) {
      scheduleSync(() => {
        const sync = async () => {
          await removeFromServerCart(target.cartItemId!).catch(() => {});
          const latest = await fetchServerCart(user.id).catch(() => null);
          const serverItems = latest?.data?.items || [];
          if (Array.isArray(serverItems) && serverItems.length) {
            const enrichedItems = await Promise.all(
              serverItems.map(async (item: any) => {
                const baseItem = {
                  cartItemId: item.id ?? item.cartItemId ?? item.itemId,
                  productId: item.productId,
                  quantity: item.quantity,
                  price: Number(item.price || item.subtotal || 0),
                  name: item.name || item.productName || `Item ${item.productId}`,
                  image: resolveCartImage(item),
                  size: item.size || null,
                };

                if (baseItem.image) return baseItem;

                const productRes = await fetchProductById(Number(item.productId)).catch(() => null);
                const product = productRes?.data;
                return {
                  ...baseItem,
                  image: resolveCartImage(item, product),
                  name: baseItem.name || product?.name || `Item ${item.productId}`,
                  price: baseItem.price || Number(product?.basePrice || 0) - Number(product?.discountPrice || 0),
                };
              }),
            );
            await hydrateFromServerCart(enrichedItems);
          } else {
            persist([]);
          }
        };

        Promise.resolve(sync()).catch(() => {});
      });
    }
  }, [items, persist, scheduleSync, isAuthenticated, user, hydrateFromServerCart]);

  const clearCart = useCallback(async () => {
    await persist([]);
    if (isAuthenticated && user) {
      scheduleSync(async () => {
        const latest = await fetchServerCart(user.id).catch(() => null);
        const cartId = latest?.data?.cart?.id || latest?.data?.cartId || latest?.data?.cart?.cartId || latest?.data?.id || null;
        if (cartId) {
          await clearServerCart(cartId).catch(() => {});
        }
      });
    }
  }, [persist, scheduleSync, isAuthenticated, user]);

  const replaceItems = useCallback((next: CartItem[]) => {
    persist(next);
  }, [persist]);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  const value = useMemo(() => ({
    items,
    totalItems,
    totalAmount,
    addItem,
    updateQty,
    removeItem,
    clearCart,
    replaceItems,
    hydrateFromServerCart,
  }), [items, totalItems, totalAmount, addItem, updateQty, removeItem, clearCart, replaceItems, hydrateFromServerCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
