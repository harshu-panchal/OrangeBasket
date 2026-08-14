import Setting from "../../models/setting.js";
import {
  DELIVERY_PRICING_MODE,
  HANDLING_FEE_STRATEGY,
} from "../../constants/finance.js";
import { roundCurrency } from "../../utils/money.js";

const DEFAULT_FINANCE_SETTINGS = {
  deliveryPricingMode: DELIVERY_PRICING_MODE.DISTANCE_BASED,
  customerBaseDeliveryFee: 30,
  baseDistanceCapacityKm: 0.5,
  incrementalKmSurcharge: 10,
  fixedDeliveryFee: 30,
  handlingFeeStrategy: HANDLING_FEE_STRATEGY.HIGHEST_CATEGORY_FEE,
  codEnabled: true,
  onlineEnabled: true,
  // --- NEW Delivery Settings ---
  customerPricingType: "distance",
  customerFixedCharge: 24,
  customerBaseDistance: 4,
  customerBaseCharge: 24,
  customerExtraPerKm: 6,
  riderEarningType: "distance",
  riderFixedEarning: 20,
  riderBaseDistance: 4,
  riderBaseEarning: 25,
  riderExtraPerKm: 5,
};

export function normalizeFinanceSettings(raw = {}) {
  const deliveryPricingMode =
    raw.deliveryPricingMode ||
    raw.pricingMode ||
    DEFAULT_FINANCE_SETTINGS.deliveryPricingMode;

  const customerBaseDeliveryFee = roundCurrency(
    raw.customerBaseDeliveryFee ?? raw.baseDeliveryCharge ?? DEFAULT_FINANCE_SETTINGS.customerBaseDeliveryFee,
  );

  const baseDistanceCapacityKm = Number(
    raw.baseDistanceCapacityKm ?? DEFAULT_FINANCE_SETTINGS.baseDistanceCapacityKm,
  );

  const incrementalKmSurcharge = roundCurrency(
    raw.incrementalKmSurcharge ?? DEFAULT_FINANCE_SETTINGS.incrementalKmSurcharge,
  );

  const fixedDeliveryFee = roundCurrency(
    raw.fixedDeliveryFee ?? raw.baseDeliveryCharge ?? customerBaseDeliveryFee,
  );

  const handlingFeeStrategy =
    raw.handlingFeeStrategy || DEFAULT_FINANCE_SETTINGS.handlingFeeStrategy;

  return {
    deliveryPricingMode,
    pricingMode: deliveryPricingMode,
    customerBaseDeliveryFee,
    baseDeliveryCharge: customerBaseDeliveryFee,
    baseDistanceCapacityKm: Number.isFinite(baseDistanceCapacityKm)
      ? Math.max(baseDistanceCapacityKm, 0)
      : DEFAULT_FINANCE_SETTINGS.baseDistanceCapacityKm,
    incrementalKmSurcharge,
    fixedDeliveryFee,
    handlingFeeStrategy,
    codEnabled: raw.codEnabled ?? DEFAULT_FINANCE_SETTINGS.codEnabled,
    onlineEnabled: raw.onlineEnabled ?? DEFAULT_FINANCE_SETTINGS.onlineEnabled,
    
    // --- NEW Delivery Settings ---
    customerPricingType: raw.customerPricingType || DEFAULT_FINANCE_SETTINGS.customerPricingType,
    customerFixedCharge: roundCurrency(raw.customerFixedCharge ?? DEFAULT_FINANCE_SETTINGS.customerFixedCharge),
    customerBaseDistance: Number(raw.customerBaseDistance ?? DEFAULT_FINANCE_SETTINGS.customerBaseDistance),
    customerBaseCharge: roundCurrency(raw.customerBaseCharge ?? DEFAULT_FINANCE_SETTINGS.customerBaseCharge),
    customerExtraPerKm: roundCurrency(raw.customerExtraPerKm ?? DEFAULT_FINANCE_SETTINGS.customerExtraPerKm),
    riderEarningType: raw.riderEarningType || DEFAULT_FINANCE_SETTINGS.riderEarningType,
    riderFixedEarning: roundCurrency(raw.riderFixedEarning ?? DEFAULT_FINANCE_SETTINGS.riderFixedEarning),
    riderBaseDistance: Number(raw.riderBaseDistance ?? DEFAULT_FINANCE_SETTINGS.riderBaseDistance),
    riderBaseEarning: roundCurrency(raw.riderBaseEarning ?? DEFAULT_FINANCE_SETTINGS.riderBaseEarning),
    riderExtraPerKm: roundCurrency(raw.riderExtraPerKm ?? DEFAULT_FINANCE_SETTINGS.riderExtraPerKm),
  };
}

export async function getOrCreateFinanceSettings({ session } = {}) {
  const query = {};
  const options = session ? { session } : {};
  let settings = await Setting.findOne(query, null, options);

  if (!settings) {
    settings = await Setting.create(
      {
        ...DEFAULT_FINANCE_SETTINGS,
        pricingMode: DEFAULT_FINANCE_SETTINGS.deliveryPricingMode,
        baseDeliveryCharge: DEFAULT_FINANCE_SETTINGS.customerBaseDeliveryFee,
      },
      options,
    );
  }

  return normalizeFinanceSettings(settings.toObject?.() || settings);
}

export async function updateDeliveryFinanceSettings(payload, { session } = {}) {
  const normalized = normalizeFinanceSettings(payload || {});
  const query = {};
  const options = { upsert: true, new: true };
  if (session) options.session = session;

  const updated = await Setting.findOneAndUpdate(query, { $set: normalized }, options);
  return normalizeFinanceSettings(updated.toObject?.() || updated);
}

export { DEFAULT_FINANCE_SETTINGS };
