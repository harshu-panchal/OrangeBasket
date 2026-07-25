import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './app/models/category.js';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const headers = await Category.find({ type: 'header' });
  console.log("Headers:");
  for (const h of headers) console.log("- " + h.name);
  
  const allHeader = await Category.findOne({ name: { $regex: /^all$/i }, type: 'header' });
  if (!allHeader) {
    console.log("No All header");
    process.exit(1);
  }
  
  console.log("All header:", allHeader._id);
  
  const cats = await Category.find({ parentId: allHeader._id });
  console.log("Categories under All:");
  for (const c of cats) {
    console.log(`- ${c.name} (${c._id})`);
    const subs = await Category.find({ parentId: c._id });
    for (const s of subs) {
      console.log(`  -> ${s.name} (${s._id}) [type: ${s.type}]`);
    }
  }
  
  mongoose.disconnect();
}

check();
