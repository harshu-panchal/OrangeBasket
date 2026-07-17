import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const categorySchema = new mongoose.Schema({}, { strict: false });
// Avoid OverwriteModelError by checking if it already exists or just using a new name, but here we run it standalone.
const Category = mongoose.model('Category', categorySchema);

async function run() {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGO_URI);
    
    // level2 categories are "category"
    // sub categories are "subcategory"
    const result = await Category.deleteMany({ type: { $in: ["category", "subcategory"] } });
    
    console.log(`Successfully deleted ${result.deletedCount} items from the database.`);
  } catch (error) {
    console.error("Error deleting categories:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from DB");
  }
}

run();
