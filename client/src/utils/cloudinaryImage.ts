// Ask Cloudinary for a resized, auto-format copy instead of the full-resolution original.
// Non-Cloudinary URLs (e.g. older base64 photos) are returned unchanged.
export const cloudinaryThumb = (url: string, width: number): string =>
  url.includes('res.cloudinary.com/') && url.includes('/upload/')
    ? url.replace('/upload/', `/upload/c_fill,w_${width},h_${width},f_auto,q_auto/`)
    : url

// Full view: no crop, capped width, so a phone never downloads a 20 MB original
export const cloudinaryFit = (url: string, maxWidth: number): string =>
  url.includes('res.cloudinary.com/') && url.includes('/upload/')
    ? url.replace('/upload/', `/upload/c_limit,w_${maxWidth},f_auto,q_auto/`)
    : url
