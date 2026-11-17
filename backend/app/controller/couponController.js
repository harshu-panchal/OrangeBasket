import Coupon from "../models/coupon.js";
import handleResponse from "../utils/helper.js";
import Order from "../models/order.js";
import Cart from "../models/cart.js";
import { buildSearchRegex } from "../utils/regex.js";
import { isServerSideCouponEngineEnabled } from "../constants/finance.js";
import { computeOrderDiscount, shouldUseServerCouponEngine } from "../services/finance/couponService.js";
import { hydrateOrderItems } from "../services/finance/pricingService.js";

const CANCELLED_STATUSES = ["cancelled", "Cancelled", "CANCELLED"];

/** Normalize creator-coupon fields on create/update. Returns an error message or null. */
function applyCreatorRules(data, { isUpdate = false } = {}) {
    if (data.isCreator === undefined) return null;
    data.isCreator = data.isCreator === true || data.isCreator === "true";
    if (data.isCreator) {
        data.creatorName = String(data.creatorName || "").trim();
        data.creatorContact = String(data.creatorContact || "").trim();
        if (!data.creatorName) return "Creator name is required for a creator coupon";
        data.perUserLimit = 1; // one use per customer
    } else if (!isUpdate) {
        delete data.creatorName;
        delete data.creatorContact;
    } else {
        data.creatorName = "";
        data.creatorContact = "";
    }
    return null;
}

/** Customer-facing list: creator coupons are never exposed here. */
export const listPublicCoupons = async (req, res) => {
    try {
        const now = new Date();
        const coupons = await Coupon.find({
            isCreator: { $ne: true },
            isActive: true,
            validFrom: { $lte: now },
            validTill: { $gte: now },
        })
            .select("-creatorName -creatorContact -metadata")
            .sort({ createdAt: -1 })
            .lean();
        return handleResponse(res, 200, "Coupons fetched successfully", coupons);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const listCoupons = async (req, res) => {
    try {
        const { status, search, kind } = req.query;
        const query = {};
        if (kind === "creator") query.isCreator = true;
        else if (kind === "normal") query.isCreator = { $ne: true };

        if (status === "active") {
            const now = new Date();
            query.isActive = true;
            query.validFrom = { $lte: now };
            query.validTill = { $gte: now };
        } else if (status === "expired") {
            query.$or = [{ isActive: false }, { validTill: { $lt: new Date() } }];
        }

        if (search) {
            const term = search.trim();
            // P3-5: substring search preserved; user input is regex-escaped.
            const safe = buildSearchRegex(term, { anchored: false });
            query.$or = [
                { code: safe },
                { title: safe },
                { description: safe },
            ];
        }

        const coupons = await Coupon.find(query).sort({ createdAt: -1 }).lean();

        // Creator performance: orders, unique customers and sales per creator code.
        const creatorIds = coupons.filter((c) => c.isCreator).map((c) => c._id);
        if (creatorIds.length) {
            const rows = await Order.aggregate([
                { $match: { coupon: { $in: creatorIds }, status: { $nin: CANCELLED_STATUSES } } },
                {
                    $group: {
                        _id: "$coupon",
                        orders: { $sum: 1 },
                        customers: { $addToSet: "$customer" },
                        sales: { $sum: { $ifNull: ["$pricing.total", 0] } },
                        discount: { $sum: { $ifNull: ["$couponSnapshot.discountAmount", 0] } },
                    },
                },
            ]);
            const byId = new Map(rows.map((r) => [String(r._id), r]));
            for (const c of coupons) {
                if (!c.isCreator) continue;
                const r = byId.get(String(c._id));
                c.creatorStats = {
                    orders: r?.orders || 0,
                    customers: r?.customers?.length || 0,
                    sales: Math.round((r?.sales || 0) * 100) / 100,
                    discountGiven: Math.round((r?.discount || 0) * 100) / 100,
                };
            }
        }

        return handleResponse(res, 200, "Coupons fetched successfully", coupons);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const createCoupon = async (req, res) => {
    try {
        const data = { ...req.body };
        delete data.usedCount;
        delete data.creatorStats;
        const creatorError = applyCreatorRules(data);
        if (creatorError) return handleResponse(res, 400, creatorError);

        if (data.validFrom) {
            const from = new Date(data.validFrom);
            from.setUTCHours(0, 0, 0, 0);
            data.validFrom = from;
        }
        if (data.validTill) {
            const till = new Date(data.validTill);
            till.setUTCHours(23, 59, 59, 999);
            data.validTill = till;
        }

        const coupon = await Coupon.create(data);
        return handleResponse(res, 201, "Coupon created successfully", coupon);
    } catch (error) {
        if (error.code === 11000) {
            return handleResponse(res, 400, "Coupon code already exists");
        }
        return handleResponse(res, 500, error.message);
    }
};

export const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const data = { ...req.body };
        delete data.usedCount;
        delete data.creatorStats;
        const creatorError = applyCreatorRules(data, { isUpdate: true });
        if (creatorError) return handleResponse(res, 400, creatorError);

        if (data.validFrom) {
            const from = new Date(data.validFrom);
            from.setUTCHours(0, 0, 0, 0);
            data.validFrom = from;
        }
        if (data.validTill) {
            const till = new Date(data.validTill);
            till.setUTCHours(23, 59, 59, 999);
            data.validTill = till;
        }

        const coupon = await Coupon.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });
        if (!coupon) {
            return handleResponse(res, 404, "Coupon not found");
        }
        return handleResponse(res, 200, "Coupon updated successfully", coupon);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

export const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await Coupon.findByIdAndDelete(id);
        return handleResponse(res, 200, "Coupon deleted successfully");
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// Simple validation engine for checkout
export const validateCoupon = async (req, res) => {
    try {
        const { code, cartTotal, items, customerId } = req.body;

        if (!code) {
            return handleResponse(res, 400, "Coupon code is required");
        }

        // Audit Phase 5 (C-2 + C-4 + H-2 + H-7): when the
        // SERVER_SIDE_COUPON_ENGINE flag is on, route through the
        // centralized engine so this endpoint and place-order use the
        // SAME validation, the SAME per-user counts (from Order.coupon),
        // and the SAME discount math (roundCurrency, not Math.round).
        //
        // Cart hydration priority:
        //   1. Server-side `Cart` collection for the customer (most
        //      trusted). Picked when `customerId` is supplied AND a
        //      cart exists.
        //   2. Client-supplied `items` array, hydrated through
        //      `hydrateOrderItems` (server prices replace client
        //      prices) — fallback for legacy flows that don't sync
        //      the cart server-side first.
        // When the flag is OFF the legacy code path below runs
        // unchanged, preserving every existing client integration.
        if (
            await shouldUseServerCouponEngine({
                engineEnabled: isServerSideCouponEngineEnabled(),
                couponCode: code,
            })
        ) {
            const effectiveCustomerId = req.user?.id || customerId || null;
            let hydratedItems = [];

            if (effectiveCustomerId) {
                const serverCart = await Cart.findOne({ customerId: effectiveCustomerId }).lean();
                if (serverCart && Array.isArray(serverCart.items) && serverCart.items.length > 0) {
                    const cartItemsForHydration = serverCart.items.map((item) => ({
                        product: item.productId,
                        variantSku: String(item.variantSku || "").trim(),
                        quantity: item.quantity,
                    }));
                    hydratedItems = await hydrateOrderItems(cartItemsForHydration, {
                        enforceServerPricing: true,
                    });
                }
            }

            if (hydratedItems.length === 0 && Array.isArray(items) && items.length > 0) {
                hydratedItems = await hydrateOrderItems(items, {
                    enforceServerPricing: true,
                });
            }

            if (hydratedItems.length === 0) {
                return handleResponse(res, 400, "Cannot apply a coupon to an empty cart");
            }

            const result = await computeOrderDiscount({
                couponCode: code,
                customerId: effectiveCustomerId,
                hydratedItems,
            });
            if (!result) {
                return handleResponse(res, 400, "Invalid coupon code");
            }
            return handleResponse(res, 200, "Coupon applied", {
                couponId: result.coupon._id,
                code: result.coupon.code,
                discountAmount: result.discountAmount,
                freeDelivery: result.freeDelivery,
                couponSnapshot: result.couponSnapshot,
            });
        }

        const now = new Date();
        const coupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (!coupon) {
            return handleResponse(res, 404, "Invalid coupon code");
        }

        if (!coupon.isActive || coupon.validFrom > now || coupon.validTill < now) {
            return handleResponse(res, 400, "This coupon is not active");
        }

        // Usage limits (overall)
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return handleResponse(res, 400, "This coupon has reached its usage limit");
        }

        // Per-user limit & monthly volume – basic implementation
        let userUsageCount = 0;
        let monthlyVolume = 0;
        if (customerId) {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const userOrders = await Order.find({
                customer: customerId,
                createdAt: { $gte: monthStart, $lte: now },
            }).lean();

            monthlyVolume = userOrders.reduce(
                (sum, o) => sum + (o.pricing?.total || 0),
                0
            );

            // We are not storing coupon reference on order yet, so this is a soft check.
            // Once couponId gets stored on orders, we can count exact usages.
            userUsageCount = 0;
        }

        if (coupon.perUserLimit && userUsageCount >= coupon.perUserLimit) {
            return handleResponse(res, 400, "You have already used this coupon");
        }

        if (
            coupon.couponType === "monthly_volume" &&
            coupon.monthlyVolumeThreshold &&
            monthlyVolume < coupon.monthlyVolumeThreshold
        ) {
            return handleResponse(
                res,
                400,
                "This coupon is for high‑volume buyers only"
            );
        }

        // Base conditions
        if (coupon.minOrderValue && cartTotal < coupon.minOrderValue) {
            return handleResponse(
                res,
                400,
                `Minimum order value should be ₹${coupon.minOrderValue}`
            );
        }

        if (coupon.minItems && Array.isArray(items) && items.length < coupon.minItems) {
            return handleResponse(
                res,
                400,
                `Add at least ${coupon.minItems} items to use this coupon`
            );
        }

        // Category based condition
        if (
            coupon.couponType === "category_based" &&
            Array.isArray(coupon.applicableCategories) &&
            coupon.applicableCategories.length > 0
        ) {
            const hasEligibleItem =
                Array.isArray(items) &&
                items.some((i) =>
                    coupon.applicableCategories.some(
                        (cId) =>
                            String(i.categoryId) === String(cId) ||
                            String(i.category?._id) === String(cId)
                    )
                );
            if (!hasEligibleItem) {
                return handleResponse(
                    res,
                    400,
                    "This coupon is valid only on selected categories"
                );
            }
        }

        // Calculate discount
        let discountAmount = 0;
        let freeDelivery = false;

        if (coupon.discountType === "free_delivery") {
            freeDelivery = true;
        } else if (coupon.discountType === "percentage") {
            discountAmount = Math.round((cartTotal * coupon.discountValue) / 100);
        } else if (coupon.discountType === "fixed") {
            discountAmount = coupon.discountValue;
        }

        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount;
        }

        if (discountAmount <= 0 && !freeDelivery) {
            return handleResponse(
                res,
                400,
                "This coupon does not provide any discount on current cart"
            );
        }

        return handleResponse(res, 200, "Coupon applied", {
            couponId: coupon._id,
            code: coupon.code,
            discountAmount,
            freeDelivery,
        });
    } catch (error) {
        // Audit Phase 5: honor `error.statusCode` so the centralized
        // engine's 400/404 errors (e.g. "Coupon not active",
        // "Minimum order value should be ₹500") surface as the
        // intended HTTP status. Legacy throws without a `statusCode`
        // continue to return 500 — preserving existing semantics for
        // unexpected DB/system failures.
        return handleResponse(res, error.statusCode || 500, error.message);
    }
};

