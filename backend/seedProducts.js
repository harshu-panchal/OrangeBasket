import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './app/models/category.js';
import Product from './app/models/product.js';
import Seller from './app/models/seller.js';

dotenv.config();

const productsToSeed = [
    { subcategory: "Wheat Flour", name: "Aashirvaad Shudh Chakki Atta (10kg)", price: 450, mainImage: "https://www.bigbasket.com/media/uploads/p/l/40127506_7-aashirvaad-shudh-chakki-atta.jpg" },
    { subcategory: "Maida", name: "Fortune Maida (1kg)", price: 50, mainImage: "https://www.bigbasket.com/media/uploads/p/l/40158283_5-fortune-maida.jpg" },
    { subcategory: "Besan", name: "Tata Sampann Besan (500g)", price: 65, mainImage: "https://www.bigbasket.com/media/uploads/p/l/40106887_4-tata-sampann-besan.jpg" },
    { subcategory: "Rava (Suji)", name: "Rajdhani Sooji/Rava (500g)", price: 35, mainImage: "https://www.bigbasket.com/media/uploads/p/l/10000455_16-rajdhani-soojirava.jpg" },
    { subcategory: "Multigrain Flour", name: "Aashirvaad Atta - Multigrain (5kg)", price: 290, mainImage: "https://www.bigbasket.com/media/uploads/p/l/1214041_1-aashirvaad-atta-multigrain-5-kg-pouch.jpg" },
    
    { subcategory: "Toor Dal", name: "Tata Sampann Toor Dal (1kg)", price: 180, mainImage: "https://www.bigbasket.com/media/uploads/p/l/40000291_10-tata-sampann-unpolished-toor-dalarhar-dal.jpg" },
    { subcategory: "Moong Dal", name: "Tata Sampann Moong Dal (500g)", price: 75, mainImage: "https://www.bigbasket.com/media/uploads/p/l/40000293_10-tata-sampann-unpolished-moong-dal.jpg" },
    { subcategory: "Chana Dal", name: "Tata Sampann Chana Dal (1kg)", price: 110, mainImage: "https://www.bigbasket.com/media/uploads/p/l/40000289_11-tata-sampann-unpolished-chana-dal.jpg" },
    { subcategory: "Masoor Dal", name: "Tata Sampann Masoor Dal (500g)", price: 60, mainImage: "https://www.bigbasket.com/media/uploads/p/l/40000294_10-tata-sampann-unpolished-masoor-dal.jpg" },
    { subcategory: "Urad Dal", name: "Tata Sampann Urad Dal (500g)", price: 85, mainImage: "https://www.bigbasket.com/media/uploads/p/l/40000297_9-tata-sampann-unpolished-urad-dal-whole.jpg" },
    { subcategory: "Rajma", name: "Tata Sampann Rajma (500g)", price: 95, mainImage: "https://www.bigbasket.com/media/uploads/p/l/40000299_10-tata-sampann-unpolished-rajma-chitra.jpg" },
    { subcategory: "Chole", name: "Tata Sampann Kabuli Chana (500g)", price: 105, mainImage: "https://www.bigbasket.com/media/uploads/p/l/40000296_9-tata-sampann-unpolished-kabuli-chana.jpg" }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        const seller = await Seller.findOne({ email: "harsh@appzeto.com" });
        if (!seller) {
            console.error("Seller harsh@appzeto.com not found!");
            process.exit(1);
        }

        for (const data of productsToSeed) {
            // Find Subcategory
            const subCategory = await Category.findOne({ name: data.subcategory, type: "subcategory" });
            if (!subCategory) {
                console.log(`Subcategory ${data.subcategory} not found, skipping.`);
                continue;
            }

            // Find parent category
            const category = await Category.findById(subCategory.parentId);
            if (!category) {
                console.log(`Parent category for ${data.subcategory} not found, skipping.`);
                continue;
            }

            // Generate unique slug
            const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
            const sku = 'SKU-' + Date.now() + Math.floor(Math.random() * 1000);
            
            const newProduct = new Product({
                name: data.name,
                slug: slug,
                sku: sku,
                price: data.price + 20, // slightly higher price for MRP
                salePrice: data.price,
                stock: 100,
                mainImage: data.mainImage,
                headerId: category.parentId || category._id, // if category has no parent, fallback
                categoryId: category._id,
                subcategoryId: subCategory._id,
                sellerId: seller._id,
                status: "active",
                approvalStatus: "approved",
                isMonthlyKit: false
            });

            await newProduct.save();
            console.log(`Created product: ${data.name}`);
        }

        console.log("Seeding complete.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
