import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Warehouse from './app/models/warehouse.js';

dotenv.config();

const approveAll = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await Warehouse.updateMany({}, { 
            $set: { 
                isVerified: true, 
                isActive: true, 
                applicationStatus: 'approved' 
            } 
        });
        console.log('All warehouses approved');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

approveAll();
