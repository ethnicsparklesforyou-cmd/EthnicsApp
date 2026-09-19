import { Image } from 'react-native';

const BASE = 'https://api.ethnicsparkles.com';

export function normalizeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `${BASE}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

/**
 * Optimize image URL for lightning fast loading on mobile devices.
 * For Cloudinary URLs, injects automatic WebP/modern format, quality optimization, and mobile screen width.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number = 700,
  quality: string = 'auto:good'
): string | null {
  if (!url) return null;
  const normalized = normalizeUrl(url);
  if (!normalized) return null;

  // Cloudinary on-the-fly dynamic resizing and compression
  if (normalized.includes('res.cloudinary.com') && normalized.includes('/image/upload/')) {
    // Avoid duplicate transformations
    if (
      normalized.includes('/f_auto') ||
      normalized.includes('/q_auto') ||
      normalized.includes('/w_')
    ) {
      return normalized;
    }
    const transform = `f_auto,q_${quality},w_${width},c_limit`;
    return normalized.replace('/image/upload/', `/image/upload/${transform}/`);
  }

  return normalized;
}

// Utility to extract the first image URL from a product object with optional auto-optimization
export function getFirstImageUrl(product: any, optimizeWidth?: number): string | null {
  if (!product) return null;

  let rawUrl: string | null = null;

  // Direct imageUrl field
  if (product.imageUrl && typeof product.imageUrl === 'string') {
    rawUrl = product.imageUrl;
  }
  // images array (from product detail API or list API)
  else if (Array.isArray(product.images) && product.images.length > 0) {
    const first = product.images[0];
    if (typeof first === 'string') rawUrl = first;
    else if (first?.imageUrl && typeof first.imageUrl === 'string') rawUrl = first.imageUrl;
    else if (first?.url && typeof first.url === 'string') rawUrl = first.url;
    else if (first?.image && typeof first.image === 'string') rawUrl = first.image;
  }
  // productImage field
  else if (product.productImage && typeof product.productImage === 'string') {
    rawUrl = product.productImage;
  }
  // media or photo fields
  else if (product.media?.imageUrl && typeof product.media.imageUrl === 'string') {
    rawUrl = product.media.imageUrl;
  } else if (product.photo && typeof product.photo === 'string') {
    rawUrl = product.photo;
  }

  if (!rawUrl) return null;

  if (optimizeWidth && optimizeWidth > 0) {
    return getOptimizedImageUrl(rawUrl, optimizeWidth);
  }
  return normalizeUrl(rawUrl);
}

/**
 * Prefetch a batch of product images into native memory/disk cache ahead of time
 */
export function prefetchProductImages(products: any[], maxCount: number = 15, optimizeWidth: number = 700): void {
  if (!Array.isArray(products) || products.length === 0) return;
  const targetBatch = products.slice(0, maxCount);
  targetBatch.forEach(product => {
    try {
      const uri = getFirstImageUrl(product, optimizeWidth);
      if (uri && typeof uri === 'string' && (uri.startsWith('http://') || uri.startsWith('https://'))) {
        Image.prefetch(uri).catch(() => { });
      }
    } catch {
      // Ignore prefetch error silently
    }
  });
}

export function getCategoryImageUrl(category: any): string | null {
  if (!category) return null;

  const candidates = [
    category.imageUrl,
    category.image,
    category.categoryImage,
    category.category_image,
    category.thumbnail,
    category.thumbnailUrl,
    category.thumbnail_url,
    category.icon,
    category.photo,
    category.imagePath,
    category.image_path,
    category?.media?.imageUrl,
    category?.media?.url,
    category?.media?.path,
    category?.media?.thumbnailUrl,
    category?.image?.url,
    category?.image?.imageUrl,
    category?.image?.path,
    category?.bannerImage?.url,
    category?.bannerImage?.imageUrl,
    category?.banner?.url,
    category?.banner?.imageUrl,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return normalizeUrl(candidate);
    }
  }

  return null;
}

export function getBannerImageUrl(banner: any): string | null {
  if (!banner) return null;

  const candidates = [
    banner.imageUrl,
    banner.image,
    banner.bannerImage,
    banner.banner_image,
    banner.thumbnail,
    banner.thumbnailUrl,
    banner.thumbnail_url,
    banner.photo,
    banner.media?.imageUrl,
    banner.media?.url,
    banner.media?.path,
    banner.file?.url,
    banner.file?.path,
    banner?.image?.url,
    banner?.image?.imageUrl,
    banner?.image?.path,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return normalizeUrl(candidate);
    }
  }

  return null;
}
