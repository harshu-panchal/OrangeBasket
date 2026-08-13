const mongoose = require("mongoose");
require("dotenv").config();

async function fixIndexes() {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/orangebasket", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log("Connected to DB.");
        const db = mongoose.connection.db;
        const collection = db.collection("legalpages"); // Mongoose pluralizes LegalPage to legalpages
        
        const indexes = await collection.indexes();
        console.log("Current indexes:", indexes);
        
        // Find the old index (usually named type_1)
        const oldIndex = indexes.find(i => i.name === "type_1");
        if (oldIndex) {
            console.log("Dropping old unique index on 'type'...");
            await collection.dropIndex("type_1");
            console.log("Dropped.");
        } else {
            console.log("Old index 'type_1' not found.");
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

fixIndexes();
