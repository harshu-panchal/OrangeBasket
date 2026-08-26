const CLOUDINARY_REGEX = /res\.cloudinary\.com/i;
const CLOUDINARY_UPLOAD_SEGMENT_REGEX = /\/upload\/([^/]+)\//i;

/**
 * Resolves relative or localhost media URLs to current production domain automatically.
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return url || "";
  
  // If relative path: /uploads/...
  if (url.startsWith("/uploads/")) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://orangebasket.in";
    return `${origin}${url}`;
  }
  
  // If it has localhost:5000 but user is on production domain (orangebasket.in), map it to current domain
  if (url.includes("localhost:5000/uploads/") && typeof window !== "undefined" && !window.location.hostname.includes("localhost")) {
    return url.replace(/https?:\/\/localhost:5000/i, window.location.origin);
  }
  
  return url;
}

/**
 * Appends Cloudinary optimisation transforms to a URL.
 * Safe to call on any URL — non-Cloudinary URLs are returned unchanged.
 */
export function applyCloudinaryTransform(rawUrl, params = "f_auto,q_auto,w_400,dpr_auto") {
  if (!rawUrl) return null;
  const url = resolveMediaUrl(rawUrl);
  if (!CLOUDINARY_REGEX.test(url)) return url;
  const match = url.match(CLOUDINARY_UPLOAD_SEGMENT_REGEX);
  if (!match) return url;

  const segmentAfterUpload = match[1] || "";
  const alreadyHasTransforms =
    segmentAfterUpload.includes(",") ||
    /^[a-z]{1,4}_[^/]+$/i.test(segmentAfterUpload);

  if (alreadyHasTransforms) return url;

  // Insert transform before the segment after `/upload/` (often `v123...`).
  return url.replace(CLOUDINARY_UPLOAD_SEGMENT_REGEX, `/upload/${params}/$1/`);
}

export function isCloudinaryUrl(url) {
  return !!url && CLOUDINARY_REGEX.test(url);
}

export function buildCloudinarySrcSet(
  url,
  entries,
  baseParams = "f_auto,q_auto,c_fill,g_auto",
) {
  if (!isCloudinaryUrl(url) || !Array.isArray(entries) || entries.length === 0)
    return undefined;

  return entries
    .map(({ w, h }) => {
      const params = [
        baseParams,
        typeof w === "number" ? `w_${w}` : null,
        typeof h === "number" ? `h_${h}` : null,
      ]
        .filter(Boolean)
        .join(",");

      const href = applyCloudinaryTransform(url, params) || url;
      const descriptor = typeof w === "number" ? `${w}w` : "";
      return descriptor ? `${href} ${descriptor}` : href;
    })
    .join(", ");
}
