import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './app/models/category.js';

dotenv.config();

async function checkTree() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const selectFields = "name slug image iconId type parentId headerColor headerFontColor headerIconColor";
  const rawCategories = await Category.find({ type: "header" })
    .select(selectFields)
    .populate({
      path: "children",
      select: selectFields,
      populate: {
        path: "children",
        select: selectFields,
      },
    })
    .sort({ name: 1, _id: 1 })
    .lean();
    
  console.log(JSON.stringify(rawCategories, null, 2));
  
  mongoose.disconnect();
}

checkTree();
