/**
 * Calculate the delivery boy earning based on the finalized route distance.
 *
 * @param {Object} params
 * @param {number} params.distanceKm - Actual route distance in kilometers
 * @param {Object} params.settings - The delivery settings (from Setting model)
 * @returns {number} The calculated rider earning
 */
export const calculateRiderEarning = ({ distanceKm, settings }) => {
  if (settings.riderEarningType === "fixed") {
    return settings.riderFixedEarning || 0;
  }

  const baseDistance = settings.riderBaseDistance || 0;
  const baseEarning = settings.riderBaseEarning || 0;
  const extraPerKm = settings.riderExtraPerKm || 0;

  if (distanceKm <= baseDistance) {
    return baseEarning;
  }

  const extraDistance = distanceKm - baseDistance;
  const extraKm = Math.ceil(extraDistance);

  return baseEarning + (extraKm * extraPerKm);
};
