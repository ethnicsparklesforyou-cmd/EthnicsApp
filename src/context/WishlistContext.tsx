import React, { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';
import { useAuth } from './AuthContext';
import { addToWishlist, fetchWishlist, removeFromWishlist } from '../services/wishlist';

type WishlistContextValue = {
  ids: Set<number>;
  toggle: (productId: number) => Promise<void>;
  isWishlisted: (productId: number) => boolean;
  refreshWishlist: () => Promise<void>;
};

const STORAGE_KEY = '@jwellery_wishlist';
const WishlistContext = createContext<WishlistContextValue | null>(null);

function extractWishlistedProductIds(payload: any): number[] {
  const items = payload?.data?.data ?? payload?.data ?? payload?.result?.data ?? payload?.result ?? [];
  if (!Array.isArray(items)) return [];

  return items
    .map((w: any) => {
      const candidate =
        w?.productId ??
        w?.product_id ??
        w?.product?.id ??
        w?.product?.productId ??
        null;
      const parsed = Number(candidate);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    })
    .filter((id: number | null): id is number => id !== null);
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<number>>(new Set());
  const { user, isAuthenticated } = useAuth();

  const syncWishlist = useCallback(async () => {
    if (isAuthenticated && user?.id) {
      try {
        const res = await fetchWishlist(user.id);
        const items = extractWishlistedProductIds(res);
        setIds(new Set(items));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw) {
            const cached = JSON.parse(raw) as number[];
            const valid = cached.map(Number).filter(n => Number.isFinite(n) && n > 0);
            setIds(new Set(valid));
          }
        } catch {
          setIds(new Set());
        }
      }
    } else {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setIds(new Set(JSON.parse(raw) as number[]));
      } catch {}
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    syncWishlist();
  }, [syncWishlist]);

  const toggle = useCallback(
    async (productId: number) => {
      const numericId = Number(productId);
      if (!Number.isFinite(numericId) || numericId <= 0) return;

      const isCurrentlyWishlisted = ids.has(numericId);
      let nextIds: Set<number> | null = null;

      startTransition(() => {
        setIds(prev => {
          const next = new Set(prev);
          if (isCurrentlyWishlisted) {
            next.delete(numericId);
          } else {
            next.add(numericId);
          }
          nextIds = next;
          return next;
        });
      });

      if (nextIds) {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...nextIds])).catch(() => {});
      }

      if (isAuthenticated && user?.id) {
        InteractionManager.runAfterInteractions(() => {
          if (isCurrentlyWishlisted) {
            removeFromWishlist({ userId: user.id, productId: numericId }).catch(err => {
              console.error('Failed to remove from wishlist:', err);
            });
          } else {
            addToWishlist({ userId: user.id, productId: numericId }).catch(err => {
              console.error('Failed to add to wishlist:', err);
            });
          }
        });
      }
    },
    [ids, isAuthenticated, user?.id],
  );

  const isWishlisted = useCallback((productId: number) => ids.has(Number(productId)), [ids]);

  const value = useMemo(
    () => ({ ids, toggle, isWishlisted, refreshWishlist: syncWishlist }),
    [ids, toggle, isWishlisted, syncWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
