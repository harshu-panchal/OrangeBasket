import { jest } from "@jest/globals";

const mockProductFind = jest.fn();
const mockCategoryFind = jest.fn();
const mockSellerFindById = jest.fn();
const mockWarehouseFindById = jest.fn();
const mockGetCachedRoute = jest.fn();

const chain = (result) => ({
  select: jest.fn().mockReturnThis(),
  session: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(result),
});

jest.unstable_mockModule("../app/models/product.js", () => ({ default: { find: mockProductFind } }));
jest.unstable_mockModule("../app/models/category.js", () => ({ default: { find: mockCategoryFind } }));
jest.unstable_mockModule("../app/models/seller.js", () => ({ default: { findById: mockSellerFindById } }));
jest.unstable_mockModule("../app/models/warehouse.js", () => ({ default: { findById: mockWarehouseFindById } }));
jest.unstable_mockModule("../app/services/mapsRouteService.js", () => ({ getCachedRoute: mockGetCachedRoute }));
jest.unstable_mockModule("../app/services/serviceAreaService.js", () => ({
  assertInServiceArea: jest.fn().mockResolvedValue({ ok: true }),
}));
jest.unstable_mockModule("../app/services/finance/financeSettingsService.js", () => ({
  getOrCreateFinanceSettings: jest.fn().mockResolvedValue({ handlingFeeStrategy: "highest_category_fee" }),
}));

const { buildCheckoutPricingSnapshot } = await import("../app/services/checkoutPricingService.js");

describe("checkout – store out of delivery range", () => {
  test("names the store and returns its id so the app can remove those cart items", async () => {
    mockProductFind.mockReturnValue(chain([
      { _id: "p1", name: "Tata Tea", price: 100, salePrice: 0, headerId: "h1", warehouseId: "wh-john", status: "active", variants: [] },
    ]));
    mockCategoryFind.mockReturnValue(chain([{ _id: "h1", name: "H", handlingFeeType: "fixed", handlingFeeValue: 0 }]));
    mockSellerFindById.mockReturnValue(chain(null)); // not a seller → falls back to warehouse
    mockWarehouseFindById.mockReturnValue(chain({
      _id: "wh-john", name: "John Doe", serviceRadius: 20, location: { coordinates: [75.8717, 22.7173] }, // Indore
    }));
    mockGetCachedRoute.mockResolvedValue({ distanceMeters: 375000, duration: 1 });

    await expect(
      buildCheckoutPricingSnapshot({
        orderItems: [{ product: "p1", quantity: 1 }],
        address: { location: { lat: 21.1458, lng: 79.0882 } }, // Nagpur
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "STORE_OUT_OF_RANGE",
      message: expect.stringContaining("John Doe, which does not deliver to this address"),
      data: { code: "STORE_OUT_OF_RANGE", storeId: "wh-john", storeName: "John Doe", radiusKm: 20, distanceKm: 375 },
    });
  });
});
