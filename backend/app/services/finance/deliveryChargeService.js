/**
 * Calculate the customer delivery charge based on the finalized route distance.
 *
 * @param {Object} params
 * @param {number} params.distanceKm - Actual route distance in kilometers
 * @param {Object} params.settings - The delivery settings (from Setting model)
 * @returns {number} The calculated customer delivery charge
 */
export const calculateCustomerDeliveryCharge = ({ distanceKm, settings }) => {
  if (settings.customerPricingType === "fixed") {
    return settings.customerFixedCharge || 0;
  }

  const baseDistance = settings.customerBaseDistance || 0;
  const baseCharge = settings.customerBaseCharge || 0;
  const extraPerKm = settings.customerExtraPerKm || 0;

  if (distanceKm <= baseDistance) {
    return baseCharge;
  }

  const extraDistance = distanceKm - baseDistance;
  const extraKm = Math.ceil(extraDistance);

  return baseCharge + (extraKm * extraPerKm);
};
