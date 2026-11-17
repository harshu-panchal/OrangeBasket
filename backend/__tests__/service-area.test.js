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
  buildServiceAreaMessage,
  clearServiceAreaCache,
  DEFAULT_SERVICE_AREA,
} = await import("../app/services/serviceAreaService.js");

// Reference points
const NAGPUR = { lat: 21.1466, lng: 79.0849 };
const KAMPTEE = { lat: 21.2236, lng: 79.1969 }; // ~14 km from Nagpur centre
const WARDHA = { lat: 20.7453, lng: 78.6022 }; // ~67 km
const INDORE = { lat: 22.7196, lng: 75.8577 };
const PUNE = { lat: 18.5204, lng: 73.8567 };
const PUNE_HINJEWADI = { lat: 18.5913, lng: 73.7389 }; // ~14 km from Pune centre

const nagpurCity = { name: "Nagpur", centerLat: 21.1458, centerLng: 79.0882, radiusKm: 25, isActive: true };
const puneCity = { name: "Pune", centerLat: 18.5204, centerLng: 73.8567, radiusKm: 30, isActive: true };
const area = (cities, extra = {}) => normalizeServiceArea({ isEnabled: true, cities, ...extra });

describe("service area – multiple cities", () => {
  beforeEach(() => {
    clearServiceAreaCache();
    mockFindOne.mockReset();
  });

  test("default is Nagpur only, 25 km, 'Only available in Nagpur'", () => {
    const a = normalizeServiceArea(undefined);
    expect(a.cities).toEqual([DEFAULT_SERVICE_AREA.cities[0]]);
    expect(a.message).toBe("Only available in Nagpur");
  });

  test.each([
    ["Nagpur centre", NAGPUR, true],
    ["Kamptee (suburb)", KAMPTEE, true],
    ["Wardha", WARDHA, false],
    ["Indore", INDORE, false],
    ["Pune", PUNE, false],
  ])("Nagpur only: %s → allowed=%s", (_n, p, allowed) => {
    expect(checkServiceArea(area([nagpurCity]), p.lat, p.lng).ok).toBe(allowed);
  });

  test("adding Pune opens Pune and keeps Nagpur", () => {
    const a = area([nagpurCity, puneCity]);
    expect(checkServiceArea(a, NAGPUR.lat, NAGPUR.lng)).toMatchObject({ ok: true, city: "Nagpur" });
    expect(checkServiceArea(a, PUNE_HINJEWADI.lat, PUNE_HINJEWADI.lng)).toMatchObject({ ok: true, city: "Pune" });
    expect(checkServiceArea(a, INDORE.lat, INDORE.lng).ok).toBe(false);
  });

  test("an inactive city is not served (prepare a launch in advance)", () => {
    const a = area([nagpurCity, { ...puneCity, isActive: false }]);
    expect(checkServiceArea(a, PUNE.lat, PUNE.lng).ok).toBe(false);
    expect(a.message).toBe("Only available in Nagpur");
  });

  test("message lists active cities", () => {
    expect(area([nagpurCity, puneCity]).message).toBe("Only available in Nagpur and Pune");
    expect(area([nagpurCity, puneCity, { ...puneCity, name: "Indore" }]).message).toBe("Only available in Nagpur, Pune and Indore");
    expect(buildServiceAreaMessage({ cities: [], customMessage: "" })).toBe("Delivery is currently not available");
  });

  test("custom message overrides the generated one", () => {
    expect(area([nagpurCity], { customMessage: "Coming soon to your city!" }).message).toBe("Coming soon to your city!");
  });

  test("legacy single-city setting is converted", () => {
    const a = normalizeServiceArea({ isEnabled: true, cityName: "Nagpur", centerLat: 21.1458, centerLng: 79.0882, radiusKm: 10 });
    expect(a.cities).toEqual([{ ...nagpurCity, radiusKm: 10 }]);
  });

  test("invalid city rows are dropped", () => {
    const a = area([nagpurCity, { name: "", centerLat: 1, centerLng: 1, radiusKm: 5 }, { name: "X", centerLat: "a", centerLng: 1, radiusKm: 5 }]);
    expect(a.cities.map((c) => c.name)).toEqual(["Nagpur"]);
  });

  test("disabled service area allows everyone; unknown coords are not blocked", () => {
    expect(checkServiceArea({ ...area([nagpurCity]), isEnabled: false }, PUNE.lat, PUNE.lng).ok).toBe(true);
    expect(checkServiceArea(area([nagpurCity]), undefined, undefined)).toMatchObject({ ok: true, unknown: true });
  });

  test("assertInServiceArea throws 400 with the city message", async () => {
    mockFindOne.mockResolvedValue({ serviceArea: { cities: [nagpurCity, puneCity] } });
    await expect(assertInServiceArea(INDORE)).rejects.toMatchObject({
      statusCode: 400,
      code: "OUTSIDE_SERVICE_AREA",
      message: "Only available in Nagpur and Pune",
    });
  });

  test("assertInServiceArea passes inside any active city", async () => {
    mockFindOne.mockResolvedValue({ serviceArea: { cities: [nagpurCity, puneCity] } });
    await expect(assertInServiceArea(PUNE_HINJEWADI)).resolves.toMatchObject({ ok: true, city: "Pune" });
  });

  test("no settings document → Nagpur default", async () => {
    mockFindOne.mockResolvedValue(null);
    await expect(assertInServiceArea(INDORE)).rejects.toMatchObject({ message: "Only available in Nagpur" });
  });
});
