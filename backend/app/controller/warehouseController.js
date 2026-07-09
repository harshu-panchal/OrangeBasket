import Warehouse from "../models/warehouse.js";
import Transaction from "../models/transaction.js";
import { handleResponse, calculateDistance } from "../utils/helper.js";
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
