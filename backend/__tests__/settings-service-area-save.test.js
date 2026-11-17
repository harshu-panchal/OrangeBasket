import { jest } from "@jest/globals";

const mockFindOneAndUpdate = jest.fn();
jest.unstable_mockModule("../app/models/setting.js", () => ({
  default: { findOneAndUpdate: mockFindOneAndUpdate, findOne: jest.fn() },
}));
jest.unstable_mockModule("../app/services/cacheService.js", () => ({
  buildKey: jest.fn(), getOrSet: jest.fn(), getTTL: jest.fn(), invalidate: jest.fn().mockResolvedValue(),
}));
jest.unstable_mockModule("../app/services/mediaService.js", () => ({ uploadToCloudinary: jest.fn() }));

const { updateSettings } = await import("../app/controller/settingsController.js");

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("admin save – service area cities", () => {
  beforeEach(() => mockFindOneAndUpdate.mockReset());

  test("stores the city list; derived `message` from a round-trip is ignored", async () => {
    mockFindOneAndUpdate.mockImplementation((_f, update) => ({ toObject: () => ({ serviceArea: {
      isEnabled: update.$set["serviceArea.isEnabled"],
      cities: update.$set["serviceArea.cities"],
      customMessage: update.$set["serviceArea.customMessage"],
    } }) }));
    const res = mockRes();
    await updateSettings({
      body: {
        appName: "orange basket",
        serviceArea: {
          isEnabled: true,
          cities: [
            { name: "Nagpur", centerLat: 21.1458, centerLng: 79.0882, radiusKm: 25, isActive: true },
            { name: "Pune", centerLat: 18.5204, centerLng: 73.8567, radiusKm: 30, isActive: false },
          ],
          customMessage: "",
          message: "Only available in Nagpur", // sent back by the admin page, must not fail
        },
      },
    }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const set = mockFindOneAndUpdate.mock.calls[0][1].$set;
    expect(set["serviceArea.cities"]).toHaveLength(2);
    expect(set["serviceArea.message"]).toBeUndefined();
    const body = res.json.mock.calls[0][0];
    expect(body.result.serviceArea.message).toBe("Only available in Nagpur"); // Pune is not live yet
  });

  test("rejects a city without coordinates", async () => {
    const res = mockRes();
    await updateSettings({ body: { serviceArea: { cities: [{ name: "Pune", radiusKm: 30 }] } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});
