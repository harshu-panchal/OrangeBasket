const fs = require('fs');
const path = require('path');

const targetDir = 'c:\\Users\\victus\\Desktop\\orange basket\\frontend\\src\\modules\\warehouse\\components';

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace API references
    content = content.replace(/sellerApi/g, 'warehouseApi');
    // Replace Context references
    content = content.replace(/SellerOrdersContext/g, 'WarehouseOrdersContext');
    content = content.replace(/useSellerOrders/g, 'useWarehouseOrders');
    content = content.replace(/SellerProductsContext/g, 'WarehouseProductsContext');
    content = content.replace(/useSellerProducts/g, 'useWarehouseProducts');
    // Replace URL paths
    content = content.replace(/\/seller\//g, '/warehouse/');
    // General terms (case sensitive)
    content = content.replace(/Seller/g, 'Warehouse');
    content = content.replace(/seller/g, 'warehouse');
    content = content.replace(/SELLER/g, 'WAREHOUSE');

    fs.writeFileSync(filePath, content, 'utf8');
}

function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            replaceInFile(fullPath);
        }
    }
}

traverse(targetDir);
console.log('Renaming complete');
