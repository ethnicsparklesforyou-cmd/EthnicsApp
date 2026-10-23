import { API_BASE_URL, ApiResponse } from './api';
import { Product } from './products';

export type SectionMeta = {
  title?: string;
  description?: string;
};

export type HomeSectionsMap = {
  new_arrivals: Product[];
  curated_picks: Product[];
  exclusive_deals: Product[];
  trending_now: Product[];
  meta?: Record<string, SectionMeta>;
};

/**
 * Fetch all curated home screen sections in a single request
 * @param appType 'retail' | 'b2b' | 'both'
 */
export async function fetchAllHomeSections(appType: string = 'retail'): Promise<HomeSectionsMap | null> {
  try {
    const url = `${API_BASE_URL}home-sections/all?appType=${appType}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    const data = json?.data || json;

    const filterInStock = (list: any[]) =>
      Array.isArray(list) ? list.filter((p) => Number(p?.stockQuantity ?? 0) > 0) : [];

    return {
      new_arrivals: filterInStock(data?.new_arrivals),
      curated_picks: filterInStock(data?.curated_picks),
      exclusive_deals: filterInStock(data?.exclusive_deals),
      trending_now: filterInStock(data?.trending_now),
      meta: data?.meta || {},
    };
  } catch (error) {
    console.warn('Failed to fetch home sections from API:', error);
    return null;
  }
}
