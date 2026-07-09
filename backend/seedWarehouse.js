import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import Warehouse from './app/models/warehouse.js';

dotenv.config();

const seedWarehouse = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to DB');

        const email = 'test@warehouse.com';
        const phone = '9999999999';

        const existing = await Warehouse.findOne({ $or: [{ email }, { phone }] });
        if (existing) {
            console.log('Warehouse already exists. Removing it...');
            await Warehouse.deleteOne({ _id: existing._id });
        }

        console.log('Creating new approved Warehouse...');
        const warehouse = new Warehouse({
            name: 'John Doe',
            email,
            phone,
            password: 'password123',
            warehouseName: 'Main Hub',
            shopName: 'Main Hub',
            category: 'General',
            address: '123 Main St, Central City',
            isVerified: true,
            emailVerified: true,
            phoneVerified: true,
            isActive: true,
            applicationStatus: 'approved',
            location: {
                type: 'Point',
                coordinates: [77.2090, 28.6139] // Delhi
            },
            serviceRadius: 10
        });

        await warehouse.save();
        console.log('Warehouse created successfully!');
        console.log('---------------------------------');
        console.log('Email: test@warehouse.com');
        console.log('Phone: 9999999999');
        console.log('Password: password123');
        console.log('---------------------------------');

    } catch (error) {
        console.error('Error seeding warehouse:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from DB');
    }
};

seedWarehouse();
