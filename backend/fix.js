import('mongoose').then(async (m) => { 
  await m.connect('mongodb+srv://orangebasket:orange123098@orangebasket.el1udca.mongodb.net/orangebasket'); 
  const Product = m.model('Product', new m.Schema({}, {strict: false}), 'products'); 
  const Warehouse = m.model('Warehouse', new m.Schema({}, {strict: false}), 'warehouses'); 
  const warehouses = await Warehouse.find({}).lean(); 
  const wIds = warehouses.map(w => w._id); 
  const res = await Product.updateMany({ sellerId: { $in: wIds } }, { $rename: { sellerId: 'warehouseId' } }); 
  console.log('Fixed products:', res); 
  process.exit(); 
}).catch(e => { 
  console.error(e); 
  process.exit(1); 
});
