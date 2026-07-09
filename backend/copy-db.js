import { MongoClient } from 'mongodb';

const sourceUri = 'mongodb+srv://playeronline4076_db_user:GeNraYqFkAWOeNr0@cluster0.4a1dx9s.mongodb.net/quickcom?retryWrites=true&w=majority&appName=Cluster0';
const targetUri = 'mongodb+srv://orangebasket:orangebasket123098@orangebasket.el1udca.mongodb.net/orangebasket?retryWrites=true&w=majority&appName=orangebasket';

async function copyDatabase() {
    console.log('Starting database copy...');
    const sourceClient = new MongoClient(sourceUri);
    const targetClient = new MongoClient(targetUri);

    try {
        await sourceClient.connect();
        console.log('Connected to source DB');
        await targetClient.connect();
        console.log('Connected to target DB');

        const sourceDb = sourceClient.db();
        const targetDb = targetClient.db();

        const collections = await sourceDb.listCollections().toArray();
        console.log(`Found ${collections.length} collections`);

        for (let colInfo of collections) {
            const colName = colInfo.name;
            if (colName.startsWith('system.')) continue;
            
            console.log(`Copying collection: ${colName}`);
            const sourceCol = sourceDb.collection(colName);
            const targetCol = targetDb.collection(colName);
            
            // clear target collection just in case
            await targetCol.deleteMany({});
            
            const docs = await sourceCol.find({}).toArray();
            if (docs.length > 0) {
                await targetCol.insertMany(docs);
                console.log(`  -> Copied ${docs.length} documents`);
            } else {
                console.log(`  -> Empty collection, skipping insert`);
            }
        }

        console.log('Database copy completed successfully!');
    } catch (err) {
        console.error('Error copying database:', err);
    } finally {
        await sourceClient.close();
        await targetClient.close();
    }
}

copyDatabase();
