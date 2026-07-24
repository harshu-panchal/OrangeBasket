import Product from "../models/product.js";
import Category from "../models/category.js";
import HeroConfig from "../models/heroConfig.js";
import handleResponse from "../utils/helper.js";
import { uploadToCloudinary } from "../services/mediaService.js";
import logger from "../services/logger.js";

// Customer Endpoints
export const getHomeData = async (req, res) => {
    try {
        // Fetch kit banners
        const heroConfig = await HeroConfig.findOne({ pageType: "monthly_basket" });
        const banners = heroConfig ? heroConfig.banners.items : [];

        // Fetch kit categories
        const categories = await Category.find({ isKitCategory: true, status: "active" });

        // Fetch approved kits
        const kits = await Product.find({
            isMonthlyKit: true,
            status: "active",
            approvalStatus: "approved"
        }).populate("categoryId", "name");

        return handleResponse(res, 200, "Kit home data fetched successfully", {
            banners,
            categories,
            kits
        });
    } catch (error) {
        return handleResponse(res, 500, "Failed to fetch kit home data");
    }
};

export const getKitById = async (req, res) => {
    try {
        const kit = await Product.findOne({
            _id: req.params.id,
            isMonthlyKit: true
        })
        .populate("categoryId", "name")
        .populate("warehouseId", "name");

        if (!kit) {
            return handleResponse(res, 404, "Kit not found");
        }

        return handleResponse(res, 200, "Kit details fetched", kit);
    } catch (error) {
        return handleResponse(res, 500, "Failed to fetch kit");
    }
};

// Warehouse Endpoints
export const createKit = async (req, res) => {
    try {
        const warehouseId = req.user.id;
        const kitData = { ...req.body };

        // Handle multipart files (mainImage and galleryImages)
        const files = req.files || [];
        if (files.length > 0) {
            const galleryUrls = [];
            for (const file of files) {
                try {
                    if (file.fieldname === "mainImage") {
                        const url = await uploadToCloudinary(file.buffer, "kits", {
                            mimeType: file.mimetype,
                            resourceType: "image",
                        });
                        kitData.mainImage = url;
                    } else if (file.fieldname === "galleryImages") {
                        const url = await uploadToCloudinary(file.buffer, "kits", {
                            mimeType: file.mimetype,
                            resourceType: "image",
                        });
                        galleryUrls.push(url);
                    }
                } catch (err) {
                    logger.error("Cloudinary upload failed", { scope: "createKit", error: err });
                }
            }
            if (galleryUrls.length > 0) {
                kitData.galleryImages = galleryUrls;
            }
        }

        // Parse JSON fields
        if (typeof kitData.variants === "string") {
            try { kitData.variants = JSON.parse(kitData.variants); } catch (e) {}
        }
        if (typeof kitData.tags === "string") {
            try { kitData.tags = JSON.parse(kitData.tags); } catch (e) {
                kitData.tags = kitData.tags.split(",").map(t => t.trim()).filter(Boolean);
            }
        }
        if (typeof kitData.highlights === "string") {
            try { kitData.highlights = JSON.parse(kitData.highlights); } catch (e) {}
        }

        if (!kitData.slug) {
            kitData.slug = kitData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
        }
        if (!kitData.headerId) kitData.headerId = kitData.categoryId;
        if (!kitData.subcategoryId) kitData.subcategoryId = kitData.categoryId;
        if (!kitData.sku) kitData.sku = 'KIT-' + Date.now();

        const newKit = new Product({
            ...kitData,
            warehouseId,
            isMonthlyKit: true,
            approvalStatus: "pending"
        });

        await newKit.save();
        return handleResponse(res, 201, "Kit created successfully and pending approval", newKit);
    } catch (error) {
        logger.error("Create Kit Error:", { scope: "createKit", error });
        return handleResponse(res, 500, "Failed to create kit", { error: error.message });
    }
};

export const getWarehouseKits = async (req, res) => {
    try {
        const kits = await Product.find({
            warehouseId: req.user.id,
            isMonthlyKit: true
        }).populate("categoryId", "name");
        return handleResponse(res, 200, "Kits fetched successfully", kits);
    } catch (error) {
        return handleResponse(res, 500, "Failed to fetch kits");
    }
};

export const updateKit = async (req, res) => {
    try {
        const { id } = req.params;
        const kitData = { ...req.body };

        // Handle multipart files
        const files = req.files || [];
        if (files.length > 0) {
            const galleryUrls = [];
            for (const file of files) {
                try {
                    if (file.fieldname === "mainImage") {
                        const url = await uploadToCloudinary(file.buffer, "kits", {
                            mimeType: file.mimetype,
                            resourceType: "image",
                        });
                        kitData.mainImage = url;
                    } else if (file.fieldname === "galleryImages") {
                        const url = await uploadToCloudinary(file.buffer, "kits", {
                            mimeType: file.mimetype,
                            resourceType: "image",
                        });
                        galleryUrls.push(url);
                    }
                } catch (err) {
                    logger.error("Cloudinary upload failed", { scope: "updateKit", error: err });
                }
            }
            if (galleryUrls.length > 0) {
                kitData.galleryImages = galleryUrls;
            }
        }

        // Parse JSON fields
        if (typeof kitData.variants === "string") {
            try { kitData.variants = JSON.parse(kitData.variants); } catch (e) {}
        }
        if (typeof kitData.tags === "string") {
            try { kitData.tags = JSON.parse(kitData.tags); } catch (e) {
                kitData.tags = kitData.tags.split(",").map(t => t.trim()).filter(Boolean);
            }
        }
        if (typeof kitData.highlights === "string") {
            try { kitData.highlights = JSON.parse(kitData.highlights); } catch (e) {}
        }

        const kit = await Product.findOneAndUpdate(
            { _id: id, warehouseId: req.user.id, isMonthlyKit: true },
            { ...kitData, approvalStatus: "pending" }, // resets approval
            { new: true }
        );

        if (!kit) {
            return handleResponse(res, 404, "Kit not found or unauthorized");
        }

        return handleResponse(res, 200, "Kit updated successfully", kit);
    } catch (error) {
        logger.error("Update Kit Error:", { scope: "updateKit", error });
        return handleResponse(res, 500, "Failed to update kit");
    }
};

// Admin Endpoints
export const getPendingKits = async (req, res) => {
    try {
        const kits = await Product.find({
            isMonthlyKit: true,
            approvalStatus: "pending"
        }).populate("warehouseId", "name").populate("categoryId", "name");
        
        return handleResponse(res, 200, "Pending kits fetched", kits);
    } catch (error) {
        return handleResponse(res, 500, "Failed to fetch pending kits");
    }
};

export const approveKit = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body; // status: "approved" | "rejected"

        const kit = await Product.findOneAndUpdate(
            { _id: id, isMonthlyKit: true },
            {
                approvalStatus: status,
                approvalNote: note,
                approvalReviewedAt: new Date(),
                approvalReviewedBy: req.user.id
            },
            { new: true }
        );

        if (!kit) {
            return handleResponse(res, 404, "Kit not found");
        }

        return handleResponse(res, 200, "Kit approval status updated", kit);
    } catch (error) {
        return handleResponse(res, 500, "Failed to approve kit");
    }
};
