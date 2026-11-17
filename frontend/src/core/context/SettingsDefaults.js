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
    // Centred on the Nagpur warehouse with its 20 km delivery radius
    cities: [{ name: "Nagpur", centerLat: 21.173187, centerLng: 79.128415, radiusKm: 20, isActive: true }],
    customMessage: "",
    message: "Only available in Nagpur",
  },
};

function serviceAreaCities(serviceArea) {
  const list = Array.isArray(serviceArea?.cities) && serviceArea.cities.length
    ? serviceArea.cities
    : DEFAULT_SETTINGS.serviceArea.cities;
  return list.filter(
    (c) => c && c.isActive !== false && c.name &&
      Number.isFinite(Number(c.centerLat)) && Number.isFinite(Number(c.centerLng)) && Number(c.radiusKm) > 0,
  );
}

function kmBetween(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Is (lat, lng) inside any active service city? Unknown coordinates are not blocked. */
export function isInServiceArea(serviceArea, lat, lng) {
  if (serviceArea?.isEnabled === false) return true;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return true;
  return serviceAreaCities(serviceArea).some(
    (c) => kmBetween(la, ln, Number(c.centerLat), Number(c.centerLng)) <= Number(c.radiusKm),
  );
}

/** Message for customers outside: custom text, else "Only available in Nagpur and Pune". */
export function getServiceAreaMessage(serviceArea) {
  if (serviceArea?.customMessage) return serviceArea.customMessage;
  const names = serviceAreaCities(serviceArea).map((c) => c.name);
  if (!names.length) return "Delivery is currently not available";
  return `Only available in ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`}`;
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

