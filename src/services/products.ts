import { API_BASE_URL } from './api';

export type ProductImage = { id: number; imageUrl: string };

export type Product = {
  id: number;
  name: string;
  basePrice: string;
  discountPrice?: string;
  b2bPrice?: string;
  description?: string;
  stockQuantity?: number;
  avgRating?: number;
  reviewCount?: number;
  weight?: string;
  isB2b?: boolean;
  isBoth?: boolean;
  minQuantity?: number;
  images?: ProductImage[];
  subcategoryId?: number;
  metalType?: Array<{ id: number; name: string }>;
  gender?: Array<{ id: number; name: string }>;
  occasion?: Array<{ id: number; name: string }>;
  size?: Array<{ id: number; name: string }>;
  purity?: Array<{ id: number; name: string }>;
  warranty?: Array<{ id: number; name: string }>;
  gemstoneType?: Array<{ id: number; name: string }>;
  stoneSettingType?: Array<{ id: number; name: string }>;
  polishType?: Array<{ id: number; name: string }>;
  subcategories?: Array<{ name: string; categoryName: string; parentSubcategoryName?: string }>;
  skuCode?: string;
  availabilityStatus?: Array<{ name: string }>;
};

export type ProductFilters = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: (number | string)[];
  subcategoryId?: (number | string)[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: string;
  isB2b?: boolean;
};

export async function fetchProducts(filters: ProductFilters = {}) {
  const response = await fetch(`${API_BASE_URL}products/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 1, limit: 20, ...filters }),
  });
  return response.json();
}

export async function fetchProductById(id: number) {
  const response = await fetch(`${API_BASE_URL}products/fetch/${id}`);
  return response.json();
}

export async function fetchCategories() {
  const response = await fetch(`${API_BASE_URL}categories/fetch`);
  return response.json();
}

export async function fetchBanners() {
  const response = await fetch(`${API_BASE_URL}banners/fetch`);
  return response.json();
}

export async function fetchActiveBanners() {
  const response = await fetch(`${API_BASE_URL}banners/fetch-active`);
  return response.json();
}

export async function fetchProductReviews(productId: number) {
  const response = await fetch(`${API_BASE_URL}reviews/fetch/${productId}`);
  return response.json();
}

export async function fetchDeliveryEstimate(fromPin: string, toPin: string, weight: number) {
  const response = await fetch(
    `${API_BASE_URL}delivery/estimate?fromPin=${fromPin}&toPin=${toPin}&weight=${weight}`,
  );
  return response.json();
}

export async function fetchActiveCoupons(userType?: string) {
  const url = userType
    ? `${API_BASE_URL}coupons/fetch-active?userType=${encodeURIComponent(userType)}`
    : `${API_BASE_URL}coupons/fetch-active`;
  const response = await fetch(url);
  return response.json();
}

export async function addReview(payload: { productId: string; userId: string; rating: number; reviewText?: string }) {
  const response = await fetch(`${API_BASE_URL}reviews/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}

export async function deleteReview(payload: { id: number; userId: number }) {
  const response = await fetch(`${API_BASE_URL}reviews/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}
