import React, { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';
import { useAuth } from './AuthContext';
import { fetchWishlist, toggleWishlist } from '../services/wishlist';

type WishlistContextValue = {
  ids: Set<number>;
  toggle: (productId: number) => Promise<void>;
  isWishlisted: (productId: number) => boolean;
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
  const syncQueueRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      setIds(new Set());
      fetchWishlist(user.id)
        .then(res => {
          const items = extractWishlistedProductIds(res);
          setIds(new Set(items));
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        })
        .catch(() => {
          AsyncStorage.getItem(STORAGE_KEY)
            .then(raw => {
              if (!raw) return;
              const cached = JSON.parse(raw) as number[];
              const valid = cached.map(Number).filter(n => Number.isFinite(n) && n > 0);
              setIds(new Set(valid));
            })
            .catch(() => setIds(new Set()));
        });
    } else {
      AsyncStorage.getItem(STORAGE_KEY).then(raw => {
        if (raw) setIds(new Set(JSON.parse(raw) as number[]));
      });
    }
  }, [isAuthenticated, user?.id, user]);

  const toggle = useCallback(
    async (productId: number) => {
      let nextIds: Set<number> | null = null;
      startTransition(() => {
        setIds(prev => {
          const next = new Set(prev);
          next.has(productId) ? next.delete(productId) : next.add(productId);
          nextIds = next;
          return next;
        });
      });
      if (nextIds) {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...nextIds])).catch(() => {});
      }
      if (isAuthenticated && user) {
        if (syncQueueRef.current) clearTimeout(syncQueueRef.current);
        syncQueueRef.current = setTimeout(() => {
          InteractionManager.runAfterInteractions(() => {
            toggleWishlist({ userId: user.id, productId }).catch(() => {});
          });
        }, 0);
      }
    },
    [isAuthenticated, user],
  );

  const isWishlisted = useCallback((productId: number) => ids.has(productId), [ids]);

  const value = useMemo(() => ({ ids, toggle, isWishlisted }), [ids, toggle, isWishlisted]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
