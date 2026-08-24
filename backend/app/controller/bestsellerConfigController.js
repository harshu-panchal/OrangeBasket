import BestsellerConfig from "../models/bestsellerConfig.js";
import handleResponse from "../utils/helper.js";

// @desc    Get bestseller config by header ID
// @route   GET /api/bestsellers/customer/:headerId
// @route   GET /api/bestsellers/admin/:headerId
// @access  Public / Admin
export const getBestsellerConfig = async (req, res) => {
  try {
    const { headerId } = req.params;
    let config = await BestsellerConfig.findOne({ headerId });
    if (!config) {
      config = { headerId, mainCategoryIds: [] };
    }
    return handleResponse(res, 200, "Bestseller config fetched successfully", config);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// @desc    Get all bestseller configs
// @route   GET /api/bestsellers/admin
// @access  Admin
export const getAllBestsellerConfigs = async (req, res) => {
  try {
    const configs = await BestsellerConfig.find({});
    return handleResponse(res, 200, "All bestseller configs fetched successfully", configs);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

// @desc    Update bestseller config by header ID
// @route   PUT /api/bestsellers/admin/:headerId
// @access  Admin
export const updateBestsellerConfig = async (req, res) => {
  try {
    const { headerId } = req.params;
    const { mainCategoryIds } = req.body;

    let config = await BestsellerConfig.findOne({ headerId });

    if (config) {
      config.mainCategoryIds = mainCategoryIds || [];
      await config.save();
    } else {
      config = await BestsellerConfig.create({
        headerId,
        mainCategoryIds: mainCategoryIds || [],
      });
    }

    return handleResponse(res, 200, "Bestseller config updated successfully", config);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
