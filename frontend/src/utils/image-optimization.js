/**
 * WebP & performance helper for Music Discover.
 * Automatically optimizes images via ImageKit transformations.
 */

export const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80"; // Stylized musical placeholder

export const optimizeImageUrl = (url, { width, height, quality = 80 } = {}) => {
  if (!url) return FALLBACK_IMAGE;
  if (!url.includes("imagekit.io")) return url;

  const urlParams = [];
  if (width) urlParams.push(`w-${width}`);
  if (height) urlParams.push(`h-${height}`);
  if (quality) urlParams.push(`q-${quality}`);

  urlParams.push("f-webp");

  const transformString = `tr=${urlParams.join(",")}`;

  if (url.includes("?")) {
    return `${url}&${transformString}`;
  }
  return `${url}?${transformString}`;
};

/**
 * Common image sizes used in Music Discover.
 */
export const IMAGE_SIZES = {
  AVATAR: { width: 100, height: 100 },
  THUMBNAIL: { width: 400, height: 400 },
};
