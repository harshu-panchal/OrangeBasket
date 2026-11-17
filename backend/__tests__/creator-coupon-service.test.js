import { jest } from "@jest/globals";

// ── Mocks ──────────────────────────────────────────────────────────────
const mockCouponFindOne = jest.fn();
const mockCouponFindById = jest.fn();
const mockOrderCountDocuments = jest.fn();

const query = (result) => ({
  session: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(result),
});

jest.unstable_mockModule("../app/models/coupon.js", () => ({
  default: { findOne: mockCouponFindOne, findById: mockCouponFindById, updateOne: jest.fn() },
}));
jest.unstable_mockModule("../app/models/order.js", () => ({
  default: {
    countDocuments: (...args) => ({
      session: jest.fn().mockReturnThis(),
      then: (res, rej) => Promise.resolve(mockOrderCountDocuments(...args)).then(res, rej),
    }),
    find: jest.fn(() => ({ select: () => ({ lean: () => ({ session: () => [] }) }) })),
  },
}));

const { computeOrderDiscount, shouldUseServerCouponEngine, isCreatorCouponRef } = await import(
  "../app/services/finance/couponService.js"
);

// ── Fixtures ───────────────────────────────────────────────────────────
const CUSTOMER = "67f0000000000000000000c1";
const creatorCoupon = {
  _id: "67f0000000000000000000a1",
  code: "RAHUL10",
  isCreator: true,
  creatorName: "Rahul",
  isActive: true,
  validFrom: new Date(Date.now() - 86400000),
  validTill: new Date(Date.now() + 86400000),
  discountType: "percentage",
  discountValue: 10,
  couponType: "generic",
  perUserLimit: 5, // ignored for creator coupons: always 1
};
const normalCoupon = { ...creatorCoupon, _id: "67f0000000000000000000a2", code: "SAVE10", isCreator: false };
const cart = [{ product: "p1", price: 250, quantity: 2 }]; // subtotal 500

describe("creator coupon – server-side engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCouponFindOne.mockImplementation(({ code }) =>
      query(code === "RAHUL10" ? creatorCoupon : code === "SAVE10" ? normalCoupon : null),
    );
    mockOrderCountDocuments.mockResolvedValue(0);
  });

  test("applies the discount on first use by a logged-in customer", async () => {
    const r = await computeOrderDiscount({ couponCode: "rahul10", customerId: CUSTOMER, hydratedItems: cart });
    expect(r.discountAmount).toBe(50);
    expect(r.couponSnapshot.couponId).toBe(creatorCoupon._id);
    expect(mockCouponFindOne).toHaveBeenCalledWith({ code: "RAHUL10" }); // case-insensitive input
  });

  test("rejects a customer who already used the creator code once", async () => {
    mockOrderCountDocuments.mockResolvedValue(1);
    await expect(
      computeOrderDiscount({ couponCode: "RAHUL10", customerId: CUSTOMER, hydratedItems: cart }),
    ).rejects.toMatchObject({ statusCode: 400, message: "You have already used this coupon" });
  });

  test("counts only this customer's non-cancelled orders with this coupon", async () => {
    await computeOrderDiscount({ couponCode: "RAHUL10", customerId: CUSTOMER, hydratedItems: cart });
    expect(mockOrderCountDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ customer: CUSTOMER, coupon: creatorCoupon._id }),
    );
  });

  test("requires login for creator codes", async () => {
    await expect(
      computeOrderDiscount({ couponCode: "RAHUL10", customerId: null, hydratedItems: cart }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test("normal coupons keep their own perUserLimit (5 uses allowed)", async () => {
    mockOrderCountDocuments.mockResolvedValue(3);
    const r = await computeOrderDiscount({ couponCode: "SAVE10", customerId: CUSTOMER, hydratedItems: cart });
    expect(r.discountAmount).toBe(50);
  });
});

describe("shouldUseServerCouponEngine", () => {
  beforeEach(() => {
    mockCouponFindOne.mockImplementation(({ code }) =>
      query(code === "RAHUL10" ? creatorCoupon : code === "SAVE10" ? normalCoupon : null),
    );
  });

  test("creator coupon forces the engine even when the flag is off", async () => {
    expect(await shouldUseServerCouponEngine({ engineEnabled: false, couponCode: "RAHUL10" })).toBe(true);
  });
  test("normal coupon with flag off keeps legacy behaviour", async () => {
    expect(await shouldUseServerCouponEngine({ engineEnabled: false, couponCode: "SAVE10" })).toBe(false);
  });
  test("flag on always uses the engine", async () => {
    expect(await shouldUseServerCouponEngine({ engineEnabled: true, couponCode: "SAVE10" })).toBe(true);
  });
  test("no coupon → no engine", async () => {
    expect(await shouldUseServerCouponEngine({ engineEnabled: true })).toBe(false);
  });
  test("unknown code is not treated as creator", async () => {
    expect(await isCreatorCouponRef({ couponCode: "NOPE" })).toBe(false);
  });
});
