import Warehouse from "../models/warehouse.js";
import Transaction from "../models/transaction.js";
import WarehouseCheckin from "../models/warehouseCheckin.js";
import { handleResponse, calculateDistance } from "../utils/helper.js";
import { generateWarehouseQR, getCurrentWarehouseQR } from "../services/warehouseQrService.js";
import mongoose from "mongoose";



/* ===============================
   GET NEARBY WAREHOUSES
================================ */
export const getNearbyWarehouses = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return handleResponse(res, 400, "Latitude and longitude are required");
    }

    const customerLat = Number(lat);
    const customerLng = Number(lng);

    const warehouses = await Warehouse.find({
      isActive: true,
      isVerified: true,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [customerLng, customerLat] },
          $maxDistance: 100000,
        },
      },
    }).lean();

    const nearbyWarehouses = warehouses.filter((warehouse) => {
      const wLng = warehouse.location.coordinates[0];
      const wLat = warehouse.location.coordinates[1];
      const distance = calculateDistance(customerLat, customerLng, wLat, wLng);
      warehouse.distance = distance;
      return distance <= (warehouse.serviceRadius || 5);
    });

    return handleResponse(res, 200, "Nearby warehouses fetched successfully", nearbyWarehouses);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   REQUEST WITHDRAWAL (Warehouse)
================================ */
export const requestWarehouseWithdrawal = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return handleResponse(res, 400, "Please enter a valid amount");
    }

    const transactions = await Transaction.find({
      user: warehouseId,
      userModel: "Warehouse",
    }).select("status amount type").lean();

    const settledBalance = transactions
      .filter((t) => t.status === "Settled")
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    const pendingPayouts = transactions
      .filter((t) => t.type === "Withdrawal" && (t.status === "Pending" || t.status === "Processing"))
      .reduce((acc, t) => acc + Math.abs(t.amount || 0), 0);

    const availableBalance = settledBalance - pendingPayouts;

    if (amount > availableBalance) {
      return handleResponse(res, 400, `Insufficient balance. Available: ₹${availableBalance}`);
    }

    const withdrawal = await Transaction.create({
      user: warehouseId,
      userModel: "Warehouse",
      type: "Withdrawal",
      amount: -Math.abs(amount),
      status: "Pending",
      reference: `WDWH-${Date.now()}`,
    });

    return handleResponse(res, 201, "Withdrawal request submitted successfully", withdrawal);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   GET WAREHOUSE PROFILE
================================ */
export const getWarehouseProfile = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.user.id);
    if (!warehouse) {
      return handleResponse(res, 404, "Warehouse not found");
    }
    return handleResponse(res, 200, "Warehouse profile fetched successfully", warehouse);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   UPDATE WAREHOUSE PROFILE
================================ */
export const updateWarehouseProfile = async (req, res) => {
  try {
    const { name, warehouseName, shopName, phone, address, locality, pincode, city, state, lat, lng, radius } = req.body;

    const warehouse = await Warehouse.findById(req.user.id);
    if (!warehouse) {
      return handleResponse(res, 404, "Warehouse not found");
    }

    if (name) warehouse.name = name;
    const newName = warehouseName || shopName;
    if (newName) { warehouse.warehouseName = newName; warehouse.shopName = newName; }
    if (phone) warehouse.phone = phone;
    if (address !== undefined) warehouse.address = address;
    if (locality !== undefined) warehouse.locality = locality;
    if (pincode !== undefined) warehouse.pincode = pincode;
    if (city !== undefined) warehouse.city = city;
    if (state !== undefined) warehouse.state = state;

    if (lat !== undefined && lng !== undefined) {
      if (lat < -90 || lat > 90) return handleResponse(res, 400, "Invalid latitude");
      if (lng < -180 || lng > 180) return handleResponse(res, 400, "Invalid longitude");
      warehouse.location = { type: "Point", coordinates: [Number(lng), Number(lat)] };
    }

    if (radius !== undefined) {
      if (radius < 1 || radius > 100) return handleResponse(res, 400, "Radius must be between 1 and 100 km");
      warehouse.serviceRadius = Number(radius);
    }

    const updatedWarehouse = await warehouse.save();

    return handleResponse(res, 200, "Profile updated successfully", updatedWarehouse);
  } catch (error) {
    if (error.code === 11000) {
      return handleResponse(res, 400, "Phone number already in use");
    }
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   GENERATE WAREHOUSE QR CODE
================================ */
export const generateQRCode = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const result = await generateWarehouseQR(warehouseId);
    return handleResponse(res, 200, "QR code generated successfully", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/* ===============================
   GET CURRENT WAREHOUSE QR CODE
================================ */
export const getCurrentQR = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const result = await getCurrentWarehouseQR(warehouseId);
    if (!result) {
      return handleResponse(res, 200, "No QR code generated yet", null);
    }
    return handleResponse(res, 200, "Current QR code fetched", result);
  } catch (error) {
    return handleResponse(res, error.statusCode || 500, error.message);
  }
};

/* ===============================
   UPDATE CHECK-IN SETTINGS
================================ */
export const updateCheckinSettings = async (req, res) => {
  try {
    const warehouseId = req.user.id;
    const { lat, lng, checkinRadius } = req.body;

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) return handleResponse(res, 404, "Warehouse not found");

    if (lat !== undefined && lng !== undefined) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (latNum < -90 || latNum > 90) return handleResponse(res, 400, "Invalid latitude");
      if (lngNum < -180 || lngNum > 180) return handleResponse(res, 400, "Invalid longitude");
      warehouse.location = { type: "Point", coordinates: [lngNum, latNum] };
    }

    if (checkinRadius !== undefined) {
      const r = Number(checkinRadius);
      if (r < 10 || r > 2000) return handleResponse(res, 400, "Checkin radius must be between 10m and 2000m");
      warehouse.checkinRadius = r;
    }

    await warehouse.save();
    return handleResponse(res, 200, "Checkin settings updated", {
      location: warehouse.location,
      checkinRadius: warehouse.checkinRadius,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
