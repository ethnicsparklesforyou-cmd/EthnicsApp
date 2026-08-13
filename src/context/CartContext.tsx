import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

const isSameProduct = (id1: number | string, id2: number | string) => String(id1) === String(id2);

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
  const removedProductIdsRef = useRef<Set<string>>(new Set());
  const isCartClearedRef = useRef<boolean>(false);

  const saveAndSetItems = useCallback((updater: (prev: CartItem[]) => CartItem[]) => {
    setItems(prev => {
      const next = updater(prev);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
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
    if (isCartClearedRef.current) return;

    const validItems = serverItems
      .filter(item => !removedProductIdsRef.current.has(String(item.productId)))
      .map(item => ({
        cartItemId: item.cartItemId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        name: item.name || `Item ${item.productId}`,
        image: resolveCartImage(item),
        size: item.size,
      }));

    saveAndSetItems(() => validItems);
  }, [saveAndSetItems]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as CartItem[];
          if (Array.isArray(parsed) && !isCartClearedRef.current) {
            setItems(parsed);
          }
        } catch {}
      }
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
      if (Array.isArray(serverItems) && serverItems.length && !isCartClearedRef.current) {
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

        hydrateFromServerCart(enrichedItems);
      }
      syncedUserRef.current = user.id;
    };

    sync().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, hydrateFromServerCart]);

  const addItem = useCallback((item: CartItem) => {
    isCartClearedRef.current = false;
    removedProductIdsRef.current.delete(String(item.productId));

    saveAndSetItems(prev => {
      const existingIndex = prev.findIndex(i => isSameProduct(i.productId, item.productId));
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity,
          image: updated[existingIndex].image || item.image,
        };
        return updated;
      }
      return [...prev, { ...item, image: item.image || undefined }];
    });

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
  }, [saveAndSetItems, scheduleSync, isAuthenticated, user]);

  const updateQty = useCallback((productId: CartItem['productId'], quantity: number) => {
    const strId = String(productId);

    if (quantity <= 0) {
      removedProductIdsRef.current.add(strId);
    }

    saveAndSetItems(prev => {
      if (quantity <= 0) {
        return prev.filter(i => !isSameProduct(i.productId, productId));
      }
      return prev.map(i => isSameProduct(i.productId, productId) ? { ...i, quantity } : i);
    });

    if (!isAuthenticated || !user) return;

    scheduleSync(async () => {
      const target = items.find(i => isSameProduct(i.productId, productId));
      if (quantity <= 0) {
        if (target?.cartItemId) {
          await removeFromServerCart(target.cartItemId).catch(() => {});
        }
      } else {
        const currentQty = target ? target.quantity : 0;
        if (quantity > currentQty) {
          await addToServerCart({
            userId: user.id,
            productId: Number(productId),
            quantity: quantity - currentQty,
            size: target?.size || null,
          }).catch(() => {});
        } else if (target?.cartItemId) {
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
      }
    });
  }, [items, saveAndSetItems, scheduleSync, isAuthenticated, user]);

  const removeItem = useCallback((productId: CartItem['productId']) => {
    const strId = String(productId);
    removedProductIdsRef.current.add(strId);

    let targetCartItemId: number | undefined;
    setItems(prev => {
      const target = prev.find(i => isSameProduct(i.productId, productId));
      if (target) targetCartItemId = target.cartItemId;
      const next = prev.filter(i => !isSameProduct(i.productId, productId));
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });

    if (isAuthenticated && user) {
      scheduleSync(async () => {
        if (targetCartItemId) {
          await removeFromServerCart(targetCartItemId).catch(() => {});
        }
      });
    }
  }, [scheduleSync, isAuthenticated, user]);

  const clearCart = useCallback(async () => {
    isCartClearedRef.current = true;
    removedProductIdsRef.current.clear();

    setItems([]);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});

    if (isAuthenticated && user) {
      scheduleSync(async () => {
        const latest = await fetchServerCart(user.id).catch(() => null);
        const cartId = latest?.data?.cart?.id || latest?.data?.cartId || latest?.data?.cart?.cartId || latest?.data?.id || null;
        if (cartId) {
          await clearServerCart(cartId).catch(() => {});
        }
      });
    }
  }, [scheduleSync, isAuthenticated, user]);

  const replaceItems = useCallback((next: CartItem[]) => {
    saveAndSetItems(() => next);
  }, [saveAndSetItems]);

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
