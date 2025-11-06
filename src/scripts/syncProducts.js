import { initializeDatabase } from '../database/init.js';
import { Product } from '../models/Product.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database first
initializeDatabase();

// Read products from frontend data file
const frontendProductsPath = path.join(__dirname, '../../../mgx-site/src/data/products.ts');

console.log('📦 Syncing products from frontend...');

try {
  const productsFileContent = fs.readFileSync(frontendProductsPath, 'utf-8');
  
  // Extract the products array using regex (simple approach)
  const match = productsFileContent.match(/export const products = \[([\s\S]*)\];/);
  
  if (!match) {
    console.error('❌ Could not find products array in frontend file');
    process.exit(1);
  }

  // Convert TypeScript to JSON (this is a simplified approach)
  // In production, you'd want to use a proper TypeScript parser
  const productsString = match[1]
    .replace(/\/\/.*$/gm, '') // Remove comments
    .replace(/'/g, '"') // Replace single quotes with double quotes
    .replace(/(\w+):/g, '"$1":') // Quote property names
    .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas

  const productsData = JSON.parse(`[${productsString}]`);

  console.log(`Found ${productsData.length} products in frontend`);

  let synced = 0;
  let skipped = 0;

  productsData.forEach(product => {
    try {
      const existing = Product.findById(product.id);
      
      if (existing) {
        console.log(`⏭️  Skipping existing product: ${product.id}`);
        skipped++;
      } else {
        Product.create(product);
        console.log(`✅ Synced product: ${product.id}`);
        synced++;
      }
    } catch (error) {
      console.error(`❌ Error syncing product ${product.id}:`, error.message);
    }
  });

  console.log(`\n📊 Sync complete:`);
  console.log(`   ✅ Synced: ${synced}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📦 Total: ${productsData.length}`);

} catch (error) {
  console.error('❌ Error syncing products:', error);
  process.exit(1);
}

