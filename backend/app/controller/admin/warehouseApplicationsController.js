import { handleResponse } from "../../utils/helper.js";
import getPagination from "../../utils/pagination.js";
import {
  approveWarehouseApplicationById,
  getPendingWarehouseApplications,
  rejectWarehouseApplicationById,
  getActiveWarehousesList,
} from "../../services/admin/warehouseApplicationService.js";

export const getPendingWarehouses = async (req, res) => {
  try {
    const { q = "", status = "pending" } = req.query;
    const { page, limit, skip } = getPagination(req, { defaultLimit: 25, maxLimit: 100 });

    const data = await getPendingWarehouseApplications({ q, status, page, limit, skip });
    return handleResponse(res, 200, "Pending warehouse applications fetched", data);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getActiveWarehouses = async (req, res) => {
  try {
    const { q = "" } = req.query;
    const { page, limit, skip } = getPagination(req, { defaultLimit: 25, maxLimit: 100 });

    const data = await getActiveWarehousesList({ q, page, limit, skip });
    return handleResponse(res, 200, "Active warehouses fetched", data);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const approveWarehouseApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await approveWarehouseApplicationById({ warehouseId: id, reviewedBy: req.user.id });

    if (!warehouse) {
      return handleResponse(res, 404, "Warehouse not found");
    }

    return handleResponse(res, 200, "Warehouse approved successfully", warehouse);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const rejectWarehouseApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const warehouse = await rejectWarehouseApplicationById({
      warehouseId: id,
      reviewedBy: req.user.id,
      reason,
    });

    if (!warehouse) {
      return handleResponse(res, 404, "Warehouse not found");
    }

    return handleResponse(res, 200, "Warehouse application rejected", warehouse);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
