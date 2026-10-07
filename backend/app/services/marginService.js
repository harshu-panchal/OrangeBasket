/**
 * marginService.js
 * Warehouse margin resolution + selling price calculation.
 *
 * Priority: Individual product margin -> Brand margin -> Subcategory margin -> Default margin.
 * Selling Price = Distributor Purchase Price + margin %.
 */
import Brand from "../models/brand.js";
import WarehouseMargin from "../models/warehouseMargin.js";
import Product from "../models/product.js";

export const MARGIN_TYPES = ["auto", "default", "brand", "subcategory", "individual"];

export class MarginError extends Error {
  constructor(message) {
    super(message);
    this.name = "MarginError";
  }
}

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

// null for blank, NaN for invalid, otherwise the non-negative number
export const parseMargin = (v) => {
  if (isBlank(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export const calculateSellingPrice = (purchasePrice, marginPercent) =>
  round2(Number(purchasePrice) * (1 + Number(marginPercent) / 100));

export async function getMarginConfig(warehouseId) {
  const doc = await WarehouseMargin.findOne({ warehouseId }).lean();
  return {
    defaultMargin: doc?.defaultMargin ?? 0,
    subcategoryMargins: doc?.subcategoryMargins || [],
  };
}

/**
 * Pure resolver. `config` = getMarginConfig() result, `brand` = Brand doc/lean or null.
 * Returns { margin, source } where source is one of individual|brand|subcategory|default.
 */
export function resolveMarginFromConfig({
  config,
  brand,
  subcategoryId,
  marginType = "auto",
  individualMargin,
}) {
  const type = MARGIN_TYPES.includes(marginType) ? marginType : "auto";
  const individual = parseMargin(individualMargin);
  if (Number.isNaN(individual)) {
    throw new MarginError("Individual margin must be a non-negative number");
  }

  const brandMargin = brand && brand.margin !== null && brand.margin !== undefined ? brand.margin : null;
  const subEntry = subcategoryId
    ? (config.subcategoryMargins || []).find((s) => String(s.subcategoryId) === String(subcategoryId))
    : null;
  const subMargin = subEntry ? subEntry.margin : null;

  const pick = {
    individual: () => (individual !== null ? { margin: individual, source: "individual" } : null),
    brand: () => (brandMargin !== null ? { margin: brandMargin, source: "brand" } : null),
    subcategory: () => (subMargin !== null ? { margin: subMargin, source: "subcategory" } : null),
    default: () => ({ margin: config.defaultMargin ?? 0, source: "default" }),
  };

  if (type !== "auto") {
    const forced = pick[type]();
    if (!forced) {
      const label = { individual: "individual product", brand: "brand", subcategory: "subcategory" }[type];
      throw new MarginError(`No ${label} margin is set. Set one or choose a different margin type.`);
    }
    return forced;
  }

  return pick.individual() || pick.brand() || pick.subcategory() || pick.default();
}

export async function resolveMargin({ warehouseId, subcategoryId, brandId, marginType, individualMargin }) {
  const [config, brand] = await Promise.all([
    getMarginConfig(warehouseId),
    brandId ? Brand.findOne({ _id: brandId, warehouseId }).lean() : null,
  ]);
  return resolveMarginFromConfig({ config, brand, subcategoryId, marginType, individualMargin });
}

/**
 * Applies margin pricing to a product payload (mutates it).
 * Each variant carries its own purchasePrice / marginType / individualMargin; the brand is
 * shared by the whole product. Variants with a purchasePrice get salePrice computed
 * (purchase + resolved margin). Product-level fields mirror the first variant.
 * `existing` is the stored product on updates, used to fill in fields absent from the payload.
 * Returns true when margin pricing was applied.
 */
export async function applyMarginPricing(productData, warehouseId, existing = null) {
  const pick = (key) =>
    Object.prototype.hasOwnProperty.call(productData, key) ? productData[key] : existing?.[key];

  const variants = Array.isArray(productData.variants) ? productData.variants : null;
  const hasVariantPurchase = variants?.some((v) => !isBlank(v?.purchasePrice));
  const topPurchase = parseMargin(productData.purchasePrice);
  if (Number.isNaN(topPurchase)) {
    throw new MarginError("Distributor purchase price must be a non-negative number");
  }

  let brandId = pick("brandId");
  if (isBlank(brandId)) brandId = null;

  let brand = null;
  if (brandId) {
    brand = await Brand.findOne({ _id: brandId, warehouseId }).lean();
    if (!brand) throw new MarginError("Selected brand was not found in your warehouse");
    productData.brand = brand.name;
  }

  if (!hasVariantPurchase && !(topPurchase > 0)) {
    // No purchase price: manual pricing. Keep brand link, normalise blank margin inputs.
    if (Object.prototype.hasOwnProperty.call(productData, "brandId")) productData.brandId = brandId;
    for (const key of ["individualMargin", "purchasePrice"]) {
      if (isBlank(productData[key])) delete productData[key];
    }
    if (isBlank(productData.marginType)) delete productData.marginType;
    return false;
  }

  const config = await getMarginConfig(warehouseId);
  const subcategoryId = pick("subcategoryId");

  // Resolves margin + selling price for one priced item (variant or whole product)
  const price = (item, label) => {
    const purchase = Number(item.purchasePrice);
    if (!(purchase >= 0)) throw new MarginError(`Invalid distributor purchase price${label}`);
    const marginType = isBlank(item.marginType) ? "auto" : item.marginType;
    let resolved;
    try {
      resolved = resolveMarginFromConfig({
        config,
        brand,
        subcategoryId,
        marginType,
        individualMargin: item.individualMargin,
      });
    } catch (err) {
      if (err instanceof MarginError) throw new MarginError(`${err.message}${label}`);
      throw err;
    }
    const selling = calculateSellingPrice(purchase, resolved.margin);
    if (!isBlank(item.price) && selling > Number(item.price)) {
      throw new MarginError(
        `Selling price Rs.${selling} would exceed the MRP Rs.${item.price}${label}. Lower the margin or purchase price.`,
      );
    }
    return {
      purchasePrice: purchase,
      marginType,
      individualMargin: parseMargin(item.individualMargin),
      appliedMargin: resolved.margin,
      marginSource: resolved.source,
      salePrice: selling,
    };
  };

  if (variants) {
    productData.variants = variants.map((v, idx) => {
      if (isBlank(v?.purchasePrice)) return v;
      const label = v.name ? ` for variant "${v.name}"` : idx > 0 ? ` for variant ${idx + 1}` : "";
      return { ...v, ...price(v, label) };
    });
    const first = productData.variants[0];
    if (first && !isBlank(first.purchasePrice)) {
      Object.assign(productData, {
        purchasePrice: first.purchasePrice,
        salePrice: first.salePrice,
        marginType: first.marginType,
        individualMargin: first.individualMargin,
        appliedMargin: first.appliedMargin,
        marginSource: first.marginSource,
      });
    }
  } else {
    Object.assign(
      productData,
      price(
        {
          purchasePrice: topPurchase,
          price: pick("price"),
          marginType: pick("marginType"),
          individualMargin: pick("individualMargin"),
        },
        "",
      ),
    );
  }
  productData.brandId = brandId;
  return true;
}

/**
 * Re-prices every product of a warehouse that has a purchase price, using the
 * current margin configuration (per variant). Products whose recalculated selling
 * price would exceed MRP are skipped and reported.
 */
export async function recalculateWarehousePrices(warehouseId) {
  const config = await getMarginConfig(warehouseId);
  const brands = await Brand.find({ warehouseId }).lean();
  const brandMap = new Map(brands.map((b) => [String(b._id), b]));

  const products = await Product.find({
    warehouseId,
    $or: [{ purchasePrice: { $gt: 0 } }, { "variants.purchasePrice": { $gt: 0 } }],
  });

  let updated = 0;
  const skipped = [];
  for (const product of products) {
    try {
      const brand = product.brandId ? brandMap.get(String(product.brandId)) : null;
      const reprice = (item) => {
        const resolved = resolveMarginFromConfig({
          config,
          brand,
          subcategoryId: product.subcategoryId,
          marginType: item.marginType || "auto",
          individualMargin: item.individualMargin,
        });
        const selling = calculateSellingPrice(item.purchasePrice, resolved.margin);
        if (item.price && selling > Number(item.price)) throw new MarginError("exceeds MRP");
        return { salePrice: selling, appliedMargin: resolved.margin, marginSource: resolved.source };
      };

      const variants = product.variants.map((v) => {
        const plain = v.toObject();
        return plain.purchasePrice > 0 ? { ...plain, ...reprice(plain) } : plain;
      });
      product.variants = variants;

      const first = variants[0];
      if (first?.purchasePrice > 0) {
        product.salePrice = first.salePrice;
        product.appliedMargin = first.appliedMargin;
        product.marginSource = first.marginSource;
      } else if (product.purchasePrice > 0) {
        const r = reprice({
          purchasePrice: product.purchasePrice,
          price: product.price,
          marginType: product.marginType,
          individualMargin: product.individualMargin,
        });
        product.salePrice = r.salePrice;
        product.appliedMargin = r.appliedMargin;
        product.marginSource = r.marginSource;
      }
      await product.save();
      updated += 1;
    } catch (err) {
      skipped.push({ productId: product._id, name: product.name, reason: err.message });
    }
  }
  return { updated, skipped };
}
