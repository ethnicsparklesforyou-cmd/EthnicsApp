import { API_BASE_URL } from './api';

export type PromoTickerItem = {
  id?: number;
  icon: string;
  title: string;
  subtitle: string;
  targetApp?: 'retail' | 'b2b' | 'both';
};

export const DEFAULT_RETAIL_PROMO_ITEMS: PromoTickerItem[] = [
  {
    icon: 'ticket-percent-outline',
    title: 'Flat 15% OFF',
    subtitle: 'on first order',
  },
  {
    icon: 'truck-fast-outline',
    title: 'Free Delivery',
    subtitle: '₹1,000 and above',
  },
  {
    icon: 'shield-check-outline',
    title: 'Anti-Tarnish Polish',
    subtitle: 'trusted quality',
  },
];

/**
 * Fetch active promo ticker points for Retail app
 */
export async function fetchActivePromoTicker(appType: string = 'retail'): Promise<PromoTickerItem[]> {
  try {
    const url = `${API_BASE_URL}promo-ticker?app=${appType}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return DEFAULT_RETAIL_PROMO_ITEMS;
    }

    const json = await response.json();
    const items = json?.data || json?.result || json;

    if (Array.isArray(items) && items.length > 0) {
      return items.map((item: any) => ({
        id: item.id,
        icon: item.icon || 'tag-outline',
        title: item.title,
        subtitle: item.subtitle || '',
        targetApp: item.targetApp || 'both',
      }));
    }

    return DEFAULT_RETAIL_PROMO_ITEMS;
  } catch (error) {
    console.warn('Failed to fetch promo ticker from API, using default items:', error);
    return DEFAULT_RETAIL_PROMO_ITEMS;
  }
}
