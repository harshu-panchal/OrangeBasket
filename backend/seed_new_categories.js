import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './app/models/category.js';

dotenv.config();

const data = [
  { header: 'Grocery', main: 'Atta, Rice & Grains', subs: ['Atta', 'Rice', 'Flour', 'Poha', 'Oats', 'Dalia', 'Sabudana', 'Vermicelli', 'Quinoa'] },
  { header: 'Grocery', main: 'Dal & Pulses', subs: ['Toor Dal', 'Moong Dal', 'Chana Dal', 'Urad Dal', 'Masoor Dal', 'Rajma', 'Chana', 'Beans'] },
  { header: 'Grocery', main: 'Oil & Ghee', subs: ['Cooking Oil', 'Olive Oil', 'Coconut Oil', 'Ghee', 'Butter', 'Margarine'] },
  { header: 'Grocery', main: 'Sugar, Salt & Sweeteners', subs: ['Sugar', 'Brown Sugar', 'Jaggery', 'Honey', 'Salt', 'Stevia'] },
  { header: 'Grocery', main: 'Spices & Masala', subs: ['Powder Spices', 'Whole Spices', 'Blended Masala', 'Herbs & Seeds'] },
  { header: 'Beverages', main: 'Tea', subs: ['Tea Powder', 'Green Tea', 'Lemon Tea'] },
  { header: 'Beverages', main: 'Coffee', subs: ['Coffee Powder', 'Instant Coffee', 'Cold Coffee'] },
  { header: 'Beverages', main: 'Cold Drinks', subs: ['Soft Drinks', 'Energy Drinks', 'Soda'] },
  { header: 'Beverages', main: 'Juices', subs: ['Fruit Juice', 'Coconut Water'] },
  { header: 'Beverages', main: 'Health Drinks', subs: ['ORS', 'Glucose Drink', 'Protein Shake'] },
  { header: 'Beverages', main: 'Dairy Drinks', subs: ['Lassi', 'Buttermilk', 'Milkshake', 'Flavoured Milk'] },
  { header: 'Beverages', main: 'Water', subs: ['Mineral Water', 'Water Can'] },
  { header: 'Dairy & Breakfast', main: 'Milk', subs: ['Toned Milk', 'Full Cream Milk'] },
  { header: 'Dairy & Breakfast', main: 'Dairy Products', subs: ['Curd', 'Yogurt', 'Paneer', 'Cheese', 'Butter', 'Cream', 'Milk Powder'] },
  { header: 'Dairy & Breakfast', main: 'Frozen Dairy', subs: ['Ice Cream', 'Kulfi'] },
  { header: 'Dairy & Breakfast', main: 'Breakfast Foods', subs: ['Cornflakes', 'Oats Meal', 'Peanut Butter', 'Jam', 'Chocolate Spread'] },
  { header: 'Bakery & Biscuits', main: 'Bread', subs: ['White Bread', 'Brown Bread', 'Wheat Bread', 'Sandwich Bread'] },
  { header: 'Bakery & Biscuits', main: 'Bakery', subs: ['Burger Bun', 'Pizza Base', 'Pav', 'Garlic Bread', 'Muffin', 'Donut', 'Brownie', 'Croissant'] },
  { header: 'Bakery & Biscuits', main: 'Biscuits', subs: ['Marie', 'Cream', 'Glucose', 'Cookies', 'Rusk', 'Khari'] },
  { header: 'Snacks', main: 'Chips', subs: ['Potato Chips', 'Banana Chips', 'Nachos'] },
  { header: 'Snacks', main: 'Namkeen', subs: ['Bhujia', 'Sev', 'Mixture', 'Chakli', 'Khakhra'] },
  { header: 'Snacks', main: 'Healthy Snacks', subs: ['Roasted Chana', 'Makhana', 'Peanut Pack'] },
  { header: 'Snacks', main: 'Frozen Snacks', subs: ['Frozen Samosa', 'French Fries', 'Nuggets', 'Spring Roll'] },
  { header: 'Snacks', main: 'Instant Snacks', subs: ['Instant Noodles', 'Pasta'] },
  { header: 'Ready To Eat', main: 'Ready Meals', subs: ['Ready Poha', 'Upma', 'Pasta'] },
  { header: 'Ready To Eat', main: 'Soups', subs: ['Tomato Soup', 'Sweet Corn Soup'] },
  { header: 'Ready To Eat', main: 'Instant Mix', subs: ['Dhokla Mix', 'Idli Mix', 'Gulab Jamun Mix'] },
  { header: 'Ready To Eat', main: 'Pickles & Chutneys', subs: ['Mango Pickle', 'Mixed Pickle', 'Chutney'] },
  { header: 'Ready To Eat', main: 'Desserts', subs: ['Custard Powder', 'Jelly Mix'] },
  { header: 'Chocolates & Sweets', main: 'Chocolates', subs: ['Dairy Milk', 'KitKat', 'Perk', 'Munch', 'Dark Chocolate'] },
  { header: 'Chocolates & Sweets', main: 'Candies', subs: ['Lollipop', 'Candy', 'Toffee'] },
  { header: 'Chocolates & Sweets', main: 'Indian Sweets', subs: ['Rasgulla', 'Gulab Jamun', 'Soan Papdi', 'Kaju Katli', 'Laddu', 'Barfi'] },
  { header: 'Chocolates & Sweets', main: 'Dry Fruits & Chikki', subs: ['Dry Fruit Box', 'Chikki'] },
  { header: 'Fresh Produce', main: 'Fruits', subs: ['Apple', 'Banana', 'Mango', 'Grapes', 'Orange', 'Kiwi', 'Dragon Fruit'] },
  { header: 'Fresh Produce', main: 'Vegetables', subs: ['Potato', 'Onion', 'Tomato', 'Garlic', 'Ginger', 'Leafy Vegetables', 'Seasonal Vegetables'] },
  { header: 'Meat, Fish & Eggs', main: 'Eggs', subs: ['Eggs Tray'] },
  { header: 'Meat, Fish & Eggs', main: 'Chicken', subs: ['Breast', 'Curry Cut'] },
  { header: 'Meat, Fish & Eggs', main: 'Seafood', subs: ['Fish', 'Prawns'] },
  { header: 'Meat, Fish & Eggs', main: 'Processed Meat', subs: ['Sausage', 'Salami'] },
  { header: 'Meat, Fish & Eggs', main: 'Frozen Meat', subs: ['Kebabs', 'Nuggets', 'Momos'] },
  { header: 'Baby Care', main: 'Baby Food', subs: ['Cerelac', 'Formula', 'Baby Food'] },
  { header: 'Baby Care', main: 'Baby Hygiene', subs: ['Diapers', 'Wipes', 'Powder', 'Soap', 'Shampoo'] },
  { header: 'Baby Care', main: 'Baby Care', subs: ['Oil', 'Lotion', 'Rash Cream'] },
  { header: 'Baby Care', main: 'Baby Accessories', subs: ['Bottle', 'Bib', 'Comb', 'Toothbrush'] },
  { header: 'Personal Care', main: 'Bath & Body', subs: ['Soap', 'Handwash', 'Sanitizer'] },
  { header: 'Personal Care', main: 'Hair Care', subs: ['Shampoo', 'Conditioner', 'Hair Oil'] },
  { header: 'Personal Care', main: 'Oral Care', subs: ['Toothpaste', 'Toothbrush', 'Mouthwash'] },
  { header: 'Personal Care', main: 'Grooming', subs: ['Razor', 'Shaving Cream', 'Perfume', 'Deodorant'] },
  { header: 'Personal Care', main: 'Skin Care', subs: ['Face Wash', 'Face Cream', 'Lip Balm', 'Talcum Powder'] },
  { header: "Women's Care", main: 'Feminine Hygiene', subs: ['Sanitary Pads', 'Tampons', 'Panty Liners'] },
  { header: "Women's Care", main: 'Personal Care', subs: ['Intimate Wash', 'Hair Removal Cream', 'Women Razor'] },
  { header: "Women's Care", main: 'Beauty', subs: ['Facial Kit', 'Nail Paint', 'Compact Powder', 'Makeup Remover'] },
  { header: 'Household & Cleaning', main: 'Laundry', subs: ['Detergent Powder', 'Liquid Detergent', 'Fabric Conditioner'] },
  { header: 'Household & Cleaning', main: 'Dishwash', subs: ['Dishwash Liquid', 'Dishwash Bar', 'Scrub Pad'] },
  { header: 'Household & Cleaning', main: 'Bathroom Cleaning', subs: ['Toilet Cleaner', 'Bathroom Cleaner', 'Drain Cleaner'] },
  { header: 'Household & Cleaning', main: 'Home Cleaning', subs: ['Floor Cleaner', 'Glass Cleaner', 'Phenyl', 'Room Freshener'] },
  { header: 'Household & Cleaning', main: 'Pest Control', subs: ['Mosquito Spray'] },
  { header: 'Household & Cleaning', main: 'Cleaning Tools', subs: ['Broom', 'Mop', 'Toilet Brush'] },
  { header: 'Household & Cleaning', main: 'Kitchen Utility', subs: ['Garbage Bags', 'Foil', 'Cling Wrap'] },
  { header: 'Stationery & Utility', main: 'Stationery', subs: ['Pen', 'Pencil', 'Notebook', 'Marker', 'Glue', 'Tape'] },
  { header: 'Stationery & Utility', main: 'Electrical', subs: ['Batteries', 'Extension Board', 'LED Bulb'] },
  { header: 'Stationery & Utility', main: 'Mobile Accessories', subs: ['Charger', 'USB Cable'] },
  { header: 'Stationery & Utility', main: 'Utility Items', subs: ['Matchbox', 'Candle', 'Lighter', 'Umbrella', 'Raincoat'] },
  { header: 'Health & Nutrition', main: 'Protein', subs: ['Whey Protein', 'Mass Gainer'] },
  { header: 'Health & Nutrition', main: 'Supplements', subs: ['Creatine', 'BCAA', 'Electrolytes'] },
  { header: 'Health & Nutrition', main: 'Healthy Snacks', subs: ['Protein Bar', 'Energy Bar'] },
  { header: 'Health & Nutrition', main: 'Dry Fruits', subs: ['Almonds', 'Cashews', 'Raisins', 'Walnuts', 'Dates'] },
  { header: 'Health & Nutrition', main: 'Seeds', subs: ['Chia', 'Flax', 'Pumpkin Seeds'] },
  { header: 'Health & Nutrition', main: 'Wellness', subs: ['Apple Cider Vinegar', 'Detox Tea'] },
  { header: 'Home Essentials', main: 'Pooja Items', subs: ['Agarbatti', 'Dhoop', 'Camphor', 'Pooja Oil'] },
  { header: 'Home Essentials', main: 'Kitchen Storage', subs: ['Lunch Box', 'Water Bottle', 'Storage Container', 'Water Jug'] },
  { header: 'Home Essentials', main: 'Home Utility', subs: ['Bucket', 'Mug', 'Dustbin', 'Hangers', 'Rope', 'Cloth Clips'] },
  { header: 'Pet Care', main: 'Dog Products', subs: ['Dog Food', 'Dog Biscuit'] },
  { header: 'Pet Care', main: 'Cat Products', subs: ['Cat Food', 'Cat Litter'] },
  { header: 'Pet Care', main: 'Pet Accessories', subs: ['Bowl', 'Toy', 'Leash', 'Shampoo', 'Wipes'] },
  { header: 'Seasonal & Festival', main: 'Festival Items', subs: ['Holi Colors', 'Rakhi', 'Diwali Lights', 'Christmas Decorations'] },
  { header: 'Seasonal & Festival', main: 'Seasonal Care', subs: ['Sunscreen', 'Aloe Vera Gel', 'Winter Cream', 'Cooling Powder'] },
  { header: 'Seasonal & Festival', main: 'Travel & First Aid', subs: ['Travel Kit', 'First Aid Kit', 'Bandage', 'Pain Relief Spray'] },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    console.log("Deleting old categories...");
    await Category.deleteMany({});
    console.log("Deleted old categories");

    const slugify = (text, type, parentText = "") => {
      let base = text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
      if (parentText) {
        base = parentText.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '') + '-' + base;
      }
      return base + '-' + Math.random().toString(36).substring(2, 6);
    };

    const placeholderImage = 'https://via.placeholder.com/150?text=Category';

    const headerMap = {};
    const mainMap = {};

    const headerIconMap = {
      'Grocery': 'grocery',
      'Beverages': 'beverages',
      'Dairy & Breakfast': 'dairy',
      'Bakery & Biscuits': 'bakery',
      'Snacks': 'snacks',
      'Ready To Eat': 'snacks',
      'Chocolates & Sweets': 'food',
      'Fresh Produce': 'grocery',
      'Meat, Fish & Eggs': 'meat',
      'Baby Care': 'baby',
      'Personal Care': 'beauty',
      "Women's Care": 'beauty',
      'Household & Cleaning': 'cleaning',
      'Stationery & Utility': 'stationery',
      'Health & Nutrition': 'health',
      'Home Essentials': 'home',
      'Pet Care': 'pets',
      'Seasonal & Festival': 'festival'
    };

    for (const item of data) {
      let headerDoc = headerMap[item.header];
      if (!headerDoc) {
        headerDoc = await Category.create({
          name: item.header,
          slug: slugify(item.header, 'header'),
          type: 'header',
          image: placeholderImage,
          iconId: headerIconMap[item.header] || null
        });
        headerMap[item.header] = headerDoc;
      }

      let mainDoc = mainMap[item.header + '-' + item.main];
      if (!mainDoc) {
        mainDoc = await Category.create({
          name: item.main,
          slug: slugify(item.main, 'category', item.header),
          type: 'category',
          parentId: headerDoc._id,
          image: placeholderImage
        });
        mainMap[item.header + '-' + item.main] = mainDoc;
      }

      for (const sub of item.subs) {
        await Category.create({
          name: sub.trim(),
          slug: slugify(sub.trim(), 'subcategory', item.main),
          type: 'subcategory',
          parentId: mainDoc._id,
          image: placeholderImage
        });
      }
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
seed();
