import { API_BASE_URL, ApiResponse } from './api';
import { Product } from './products';

export type HomeSectionsMap = {
  new_arrivals: Product[];
  curated_picks: Product[];
  exclusive_deals: Product[];
  trending_now: Product[];
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

    return {
      new_arrivals: Array.isArray(data?.new_arrivals) ? data.new_arrivals : [],
      curated_picks: Array.isArray(data?.curated_picks) ? data.curated_picks : [],
      exclusive_deals: Array.isArray(data?.exclusive_deals) ? data.exclusive_deals : [],
      trending_now: Array.isArray(data?.trending_now) ? data.trending_now : [],
    };
  } catch (error) {
    console.warn('Failed to fetch home sections from API:', error);
    return null;
  }
}
