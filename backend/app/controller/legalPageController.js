import LegalPage from "../models/legalPage.js";
import { handleResponse } from "../utils/helper.js";

/**
 * GET /api/legal?type=terms|privacy
 * Public — no auth required.
 */
export const getPublicLegalPage = async (req, res) => {
    try {
        const { type, audience = "customer" } = req.query;
        if (!type || !["terms", "privacy"].includes(type)) {
            return handleResponse(res, 400, "Invalid type. Must be 'terms' or 'privacy'.");
        }
        if (!["customer", "seller", "warehouse", "delivery"].includes(audience)) {
            return handleResponse(res, 400, "Invalid audience.");
        }

        const page = await LegalPage.findOne({ type, audience, isPublished: true }).lean();
        if (!page) {
            return handleResponse(res, 200, "Legal page not found", {
                type,
                audience,
                title: "",
                content: "",
                exists: false,
            });
        }

        return handleResponse(res, 200, "Legal page fetched successfully", {
            ...page,
            exists: true,
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/**
 * PUT /api/legal
 * Admin-only — creates or updates a legal page.
 * Body: { type, title, content, isPublished }
 */
export const upsertLegalPage = async (req, res) => {
    try {
        const { type, audience = "customer", title, content, isPublished } = req.body;
        if (!type || !["terms", "privacy"].includes(type)) {
            return handleResponse(res, 400, "Invalid type. Must be 'terms' or 'privacy'.");
        }
        if (!["customer", "seller", "warehouse", "delivery"].includes(audience)) {
            return handleResponse(res, 400, "Invalid audience.");
        }

        const updateData = {
            title: title || (type === "terms" ? "Terms & Conditions" : "Privacy Policy"),
            content: content || "",
            isPublished: isPublished !== undefined ? isPublished : true,
            lastUpdatedBy: req.user?.id || null,
        };

        const page = await LegalPage.findOneAndUpdate(
            { type, audience },
            { $set: updateData },
            { new: true, upsert: true }
        );

        return handleResponse(res, 200, "Legal page saved successfully", page);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
