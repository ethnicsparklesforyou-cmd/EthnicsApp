// Utility to extract the first image URL from a product object
export function getFirstImageUrl(product: any): string | null {
  if (!product) return null;

  // Direct imageUrl field
  if (product.imageUrl) return normalizeUrl(product.imageUrl);

  // images array (from product detail API)
  if (Array.isArray(product.images) && product.images.length > 0) {
    const first = product.images[0];
    if (typeof first === 'string') return normalizeUrl(first);
    if (first?.imageUrl) return normalizeUrl(first.imageUrl);
    if (first?.url) return normalizeUrl(first.url);
  }

  // productImage field
  if (product.productImage) return normalizeUrl(product.productImage);

  return null;
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

const BASE = 'https://api.ethnicsparkles.com';

function normalizeUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}
