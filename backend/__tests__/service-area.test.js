import { jest } from "@jest/globals";

const mockFindOne = jest.fn();
jest.unstable_mockModule("../app/models/setting.js", () => ({
  default: {
    findOne: (...a) => {
      const q = { select: () => q, session: () => q, lean: () => mockFindOne(...a) };
      return q;
    },
  },
}));

const {
  checkServiceArea,
  assertInServiceArea,
  normalizeServiceArea,
  clearServiceAreaCache,
  DEFAULT_SERVICE_AREA,
} = await import("../app/services/serviceAreaService.js");

// Reference points
const NAGPUR_SITABULDI = { lat: 21.1466, lng: 79.0849 };
const NAGPUR_AIRPORT = { lat: 21.0922, lng: 79.0472 }; // ~7 km
const KAMPTEE = { lat: 21.2236, lng: 79.1969 }; // ~14 km
const WARDHA = { lat: 20.7453, lng: 78.6022 }; // ~67 km
const INDORE = { lat: 22.7196, lng: 75.8577 };
const PUNE = { lat: 18.5204, lng: 73.8567 };

describe("service area – Nagpur only", () => {
  beforeEach(() => {
    clearServiceAreaCache();
    mockFindOne.mockReset();
  });

  test("defaults are Nagpur, 25 km, 'Only available in Nagpur'", () => {
    expect(DEFAULT_SERVICE_AREA).toMatchObject({ cityName: "Nagpur", radiusKm: 25, message: "Only available in Nagpur", isEnabled: true });
  });

  test.each([
    ["Sitabuldi (city centre)", NAGPUR_SITABULDI, true],
    ["Nagpur airport", NAGPUR_AIRPORT, true],
    ["Kamptee (suburb)", KAMPTEE, true],
    ["Wardha", WARDHA, false],
    ["Indore", INDORE, false],
    ["Pune", PUNE, false],
  ])("%s → allowed=%s", (_name, p, allowed) => {
    expect(checkServiceArea(DEFAULT_SERVICE_AREA, p.lat, p.lng).ok).toBe(allowed);
  });

  test("disabled service area allows everyone", () => {
    expect(checkServiceArea({ ...DEFAULT_SERVICE_AREA, isEnabled: false }, PUNE.lat, PUNE.lng).ok).toBe(true);
  });

  test("unknown coordinates are not blocked by this check", () => {
    expect(checkServiceArea(DEFAULT_SERVICE_AREA, undefined, undefined)).toMatchObject({ ok: true, unknown: true });
  });

  test("bad admin values fall back to defaults", () => {
    expect(normalizeServiceArea({ radiusKm: -5, centerLat: "x" })).toMatchObject({ radiusKm: 25, centerLat: 21.1458 });
  });

  test("assertInServiceArea throws 400 with the message for outside locations", async () => {
    mockFindOne.mockResolvedValue({ serviceArea: {} }); // old settings doc → defaults
    await expect(assertInServiceArea(PUNE)).rejects.toMatchObject({
      statusCode: 400,
      code: "OUTSIDE_SERVICE_AREA",
      message: "Only available in Nagpur",
    });
  });

  test("assertInServiceArea passes inside Nagpur and respects admin radius", async () => {
    mockFindOne.mockResolvedValue({ serviceArea: { radiusKm: 5 } });
    await expect(assertInServiceArea(NAGPUR_SITABULDI)).resolves.toMatchObject({ ok: true });
    clearServiceAreaCache();
    await expect(assertInServiceArea(KAMPTEE)).rejects.toMatchObject({ statusCode: 400 }); // 14 km > 5 km
  });

  test("settings doc without serviceArea uses Nagpur defaults", async () => {
    mockFindOne.mockResolvedValue(null);
    await expect(assertInServiceArea(INDORE)).rejects.toMatchObject({ message: "Only available in Nagpur" });
  });
});
