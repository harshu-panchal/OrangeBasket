/** Default fallbacks when settings are not yet loaded or API fails */
export const DEFAULT_SETTINGS = {
  appName: "App",
  supportEmail: "",
  supportPhone: "",
  currencySymbol: "\u20B9",
  currencyCode: "INR",
  timezone: "Asia/Kolkata",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "var(--primary)",
  secondaryColor: "#64748b",
  companyName: "",
  taxId: "",
  address: "",
  facebook: "",
  twitter: "",
  instagram: "",
  linkedin: "",
  youtube: "",
  playStoreLink: "",
  appStoreLink: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  keywords: [],
  returnDeliveryCommission: 0,
  deliveryPricingMode: "distance_based",
  pricingMode: "distance_based",
  customerBaseDeliveryFee: 30,
  riderBasePayout: 30,
  baseDeliveryCharge: 30,
  baseDistanceCapacityKm: 0.5,
  incrementalKmSurcharge: 10,
  deliveryPartnerRatePerKm: 5,
  fleetCommissionRatePerKm: 5,
  fixedDeliveryFee: 30,
  handlingFeeStrategy: "highest_category_fee",
  codEnabled: true,
  onlineEnabled: true,
  lowStockAlertsEnabled: true,
  productApproval: {
    sellerCreateRequiresApproval: false,
    sellerEditRequiresApproval: false,
  },
  storeStatus: {
    isClosed: false,
    reopenTime: "",
    message: "",
  },
  // Keep in sync with backend/app/services/serviceAreaService.js
  serviceArea: {
    isEnabled: true,
    cityName: "Nagpur",
    centerLat: 21.1458,
    centerLng: 79.0882,
    radiusKm: 25,
    message: "Only available in Nagpur",
  },
};

/** Is (lat, lng) inside the configured service area? Unknown coordinates are not blocked. */
export function isInServiceArea(serviceArea, lat, lng) {
  const a = { ...DEFAULT_SETTINGS.serviceArea, ...(serviceArea || {}) };
  if (a.isEnabled === false) return true;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return true;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(Number(a.centerLat) - la);
  const dLng = toRad(Number(a.centerLng) - ln);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(la)) * Math.cos(toRad(Number(a.centerLat))) * Math.sin(dLng / 2) ** 2;
  const km = 2 * 6371 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return km <= Number(a.radiusKm || 25);
}

/**
 * Applies theme CSS variables to document root from settings.
 */
export function applyThemeVariables(settings) {
  if (!settings) return;
  const root = document.documentElement;
  const primary = settings.primaryColor || DEFAULT_SETTINGS.primaryColor;
  const secondary = settings.secondaryColor || DEFAULT_SETTINGS.secondaryColor;
  
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--secondary", secondary);
  root.style.setProperty("--primary-color", primary);
  root.style.setProperty("--secondary-color", secondary);

  // Calculate high-contrast foreground color
  if (primary && !primary.startsWith("var")) {
    const hex = primary.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    const contrastColor = yiq >= 160 ? "#000000" : "#FFFFFF";
    root.style.setProperty("--primary-foreground", contrastColor);
  }
}

