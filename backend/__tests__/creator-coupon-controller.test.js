import { jest } from "@jest/globals";

const mockCouponFind = jest.fn();
const mockCouponCreate = jest.fn();
const mockOrderAggregate = jest.fn();
const mockCompute = jest.fn();
const mockShouldUseEngine = jest.fn();
const mockHydrate = jest.fn();
const mockCartFindOne = jest.fn();

jest.unstable_mockModule("../app/models/coupon.js", () => ({
  default: { find: mockCouponFind, create: mockCouponCreate, findOne: jest.fn(), findByIdAndUpdate: jest.fn() },
}));
jest.unstable_mockModule("../app/models/order.js", () => ({
  default: { aggregate: mockOrderAggregate, find: jest.fn() },
}));
jest.unstable_mockModule("../app/models/cart.js", () => ({
  default: { findOne: (...a) => ({ lean: () => mockCartFindOne(...a) }) },
}));
jest.unstable_mockModule("../app/services/finance/couponService.js", () => ({
  computeOrderDiscount: mockCompute,
  shouldUseServerCouponEngine: mockShouldUseEngine,
}));
jest.unstable_mockModule("../app/services/finance/pricingService.js", () => ({
  hydrateOrderItems: mockHydrate,
}));

const { listPublicCoupons, listCoupons, createCoupon, validateCoupon } = await import(
  "../app/controller/couponController.js"
);

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}
const body = (res) => res.json.mock.calls[0][0];

const chain = (result) => {
  const c = { select: jest.fn(() => c), sort: jest.fn(() => c), lean: jest.fn().mockResolvedValue(result) };
  return c;
};

describe("coupon controller – creator coupons", () => {
  beforeEach(() => jest.clearAllMocks());

  test("customer list excludes creator coupons and hides creator details", async () => {
    const c = chain([{ code: "SAVE10" }]);
    mockCouponFind.mockReturnValue(c);
    const res = mockRes();
    await listPublicCoupons({ query: {} }, res);
    const q = mockCouponFind.mock.calls[0][0];
    expect(q.isCreator).toEqual({ $ne: true });
    expect(q.isActive).toBe(true);
    expect(c.select).toHaveBeenCalledWith(expect.stringContaining("-creatorName"));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("admin list attaches creator stats (orders, customers, sales)", async () => {
    const coupons = [
      { _id: "a1", code: "RAHUL10", isCreator: true },
      { _id: "a2", code: "SAVE10", isCreator: false },
    ];
    mockCouponFind.mockReturnValue(chain(coupons));
    mockOrderAggregate.mockResolvedValue([
      { _id: "a1", orders: 3, customers: ["c1", "c2", "c3"], sales: 1500.456, discount: 150 },
    ]);
    const res = mockRes();
    await listCoupons({ query: { kind: "creator" } }, res);
    expect(mockCouponFind.mock.calls[0][0]).toMatchObject({ isCreator: true });
    const list = body(res).result || body(res).results || body(res).data;
    expect(list[0].creatorStats).toEqual({ orders: 3, customers: 3, sales: 1500.46, discountGiven: 150 });
    expect(list[1].creatorStats).toBeUndefined();
  });

  test("creating a creator coupon requires a creator name", async () => {
    const res = mockRes();
    await createCoupon({ body: { code: "X", isCreator: true, creatorName: "  " } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockCouponCreate).not.toHaveBeenCalled();
  });

  test("creator coupon is saved with perUserLimit forced to 1", async () => {
    mockCouponCreate.mockResolvedValue({ _id: "new" });
    const res = mockRes();
    await createCoupon(
      { body: { code: "RAHUL10", isCreator: true, creatorName: "Rahul", perUserLimit: 9, usedCount: 500 } },
      res,
    );
    const saved = mockCouponCreate.mock.calls[0][0];
    expect(saved).toMatchObject({ isCreator: true, creatorName: "Rahul", perUserLimit: 1 });
    expect(saved.usedCount).toBeUndefined(); // admin cannot fake redemptions
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("validate uses the logged-in customer id, not the one in the body", async () => {
    mockShouldUseEngine.mockResolvedValue(true);
    mockCartFindOne.mockResolvedValue(null);
    mockHydrate.mockResolvedValue([{ price: 100, quantity: 1 }]);
    mockCompute.mockResolvedValue({
      coupon: { _id: "a1", code: "RAHUL10" }, discountAmount: 10, freeDelivery: false, couponSnapshot: {},
    });
    const res = mockRes();
    await validateCoupon(
      { user: { id: "real-customer" }, body: { code: "RAHUL10", customerId: "someone-else", items: [{ product: "p", quantity: 1 }] } },
      res,
    );
    expect(mockCompute).toHaveBeenCalledWith(expect.objectContaining({ customerId: "real-customer" }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("validate surfaces 'already used' as a 400", async () => {
    mockShouldUseEngine.mockResolvedValue(true);
    mockCartFindOne.mockResolvedValue(null);
    mockHydrate.mockResolvedValue([{ price: 100, quantity: 1 }]);
    mockCompute.mockRejectedValue(Object.assign(new Error("You have already used this coupon"), { statusCode: 400 }));
    const res = mockRes();
    await validateCoupon({ user: { id: "c1" }, body: { code: "RAHUL10", items: [{ product: "p", quantity: 1 }] } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(body(res).message).toBe("You have already used this coupon");
  });
});
