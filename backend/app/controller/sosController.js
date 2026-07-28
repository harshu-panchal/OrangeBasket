import Delivery from "../models/delivery.js";
import SOSAlert from "../models/sosAlert.js";
import handleResponse from "../utils/helper.js";
import { getIO } from "../socket/socketManager.js";

/* ===============================
   TRIGGER SOS (Delivery Boy)
================================ */
export const triggerSOS = async (req, res) => {
    try {
        const deliveryId = req.user.id;
        const { latitude, longitude } = req.body;

        const delivery = await Delivery.findById(deliveryId);
        if (!delivery) {
            return handleResponse(res, 404, "Delivery partner not found");
        }

        const coordinates =
            latitude && longitude
                ? [parseFloat(longitude), parseFloat(latitude)]
                : delivery.location?.coordinates || [0, 0];

        const sosAlert = await SOSAlert.create({
            deliveryId: delivery._id,
            deliveryName: delivery.name,
            deliveryPhone: delivery.phone,
            emergencyContacts: delivery.emergencyContacts || [],
            location: {
                type: "Point",
                coordinates,
            },
            status: "active",
        });

        // Emit real-time alert to all connected admins
        try {
            const io = getIO();
            io.to("admin:orders").emit("sos:alert", {
                _id: sosAlert._id,
                deliveryId: delivery._id,
                deliveryName: delivery.name,
                deliveryPhone: delivery.phone,
                emergencyContacts: delivery.emergencyContacts || [],
                location: {
                    type: "Point",
                    coordinates,
                },
                status: "active",
                createdAt: sosAlert.createdAt,
            });
        } catch (socketErr) {
            console.error("[SOS] Socket emit failed:", socketErr.message);
        }

        return handleResponse(res, 201, "SOS alert triggered successfully", sosAlert);
    } catch (error) {
        console.error("[SOS] Trigger error:", error);
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   UPDATE EMERGENCY CONTACTS (Delivery Boy)
================================ */
export const updateEmergencyContacts = async (req, res) => {
    try {
        const deliveryId = req.user.id;
        const { contacts } = req.body;

        if (!Array.isArray(contacts)) {
            return handleResponse(res, 400, "Contacts must be an array");
        }

        // Validate each contact
        for (const contact of contacts) {
            if (!contact.name || !contact.phone) {
                return handleResponse(
                    res,
                    400,
                    "Each contact must have a name and phone"
                );
            }
        }

        const delivery = await Delivery.findByIdAndUpdate(
            deliveryId,
            {
                emergencyContacts: contacts.map((c) => ({
                    name: c.name.trim(),
                    phone: c.phone.trim(),
                })),
            },
            { new: true }
        );

        if (!delivery) {
            return handleResponse(res, 404, "Delivery partner not found");
        }

        return handleResponse(
            res,
            200,
            "Emergency contacts updated",
            delivery.emergencyContacts
        );
    } catch (error) {
        console.error("[SOS] Update contacts error:", error);
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   GET SOS ALERTS (Admin)
================================ */
export const getSOSAlerts = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status && ["active", "acknowledged", "resolved"].includes(status)) {
            filter.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [alerts, total] = await Promise.all([
            SOSAlert.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            SOSAlert.countDocuments(filter),
        ]);

        return handleResponse(res, 200, "SOS alerts fetched", {
            alerts,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        console.error("[SOS] Get alerts error:", error);
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   ACKNOWLEDGE SOS ALERT (Admin)
================================ */
export const acknowledgeSOSAlert = async (req, res) => {
    try {
        const { id } = req.params;

        const alert = await SOSAlert.findById(id);
        if (!alert) {
            return handleResponse(res, 404, "SOS alert not found");
        }

        if (alert.status !== "active") {
            return handleResponse(
                res,
                400,
                `Alert is already ${alert.status}`
            );
        }

        alert.status = "acknowledged";
        alert.acknowledgedAt = new Date();
        await alert.save();

        return handleResponse(res, 200, "SOS alert acknowledged", alert);
    } catch (error) {
        console.error("[SOS] Acknowledge error:", error);
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   RESOLVE SOS ALERT (Admin)
================================ */
export const resolveSOSAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const alert = await SOSAlert.findById(id);
        if (!alert) {
            return handleResponse(res, 404, "SOS alert not found");
        }

        if (alert.status === "resolved") {
            return handleResponse(res, 400, "Alert is already resolved");
        }

        alert.status = "resolved";
        alert.resolvedAt = new Date();
        if (notes) alert.notes = notes;
        await alert.save();

        return handleResponse(res, 200, "SOS alert resolved", alert);
    } catch (error) {
        console.error("[SOS] Resolve error:", error);
        return handleResponse(res, 500, error.message);
    }
};
