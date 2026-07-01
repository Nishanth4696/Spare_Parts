const { db } = require('./index');

const sampleProducts = [
  { part_no: 'HD-AC-011', name: 'Activa Front Brake Shoe', brand: 'Honda', category: 'brake', hsn: '8714', gst_rate: 18, cost_price: 15000, sale_price: 22000, mrp: 25000, garage_price: 20000, stock: 12, min_stock: 4, rack_location: 'A1-03', barcode: '8901234000011' },
  { part_no: 'HD-AC-CLT', name: 'Activa Clutch Plate Set', brand: 'Honda', category: 'clutch', hsn: '8714', gst_rate: 18, cost_price: 45000, sale_price: 62000, mrp: 68000, garage_price: 58000, stock: 6, min_stock: 3, rack_location: 'A2-01', barcode: '8901234000028' },
  { part_no: 'HR-SPL-AF', name: 'Splendor Air Filter', brand: 'Hero', category: 'filter', hsn: '8421', gst_rate: 18, cost_price: 8000, sale_price: 12000, mrp: 14000, garage_price: 11000, stock: 20, min_stock: 5, rack_location: 'B1-02', barcode: '8901234000035' },
  { part_no: 'HR-SPL-CH', name: 'Splendor Drive Chain', brand: 'Hero', category: 'drivetrain', hsn: '8714', gst_rate: 18, cost_price: 35000, sale_price: 48000, mrp: 52000, garage_price: 45000, stock: 8, min_stock: 3, rack_location: 'B2-04', barcode: '8901234000042' },
  { part_no: 'TV-JUP-HL', name: 'Jupiter Headlight Assembly', brand: 'TVS', category: 'electrical', hsn: '8512', gst_rate: 18, cost_price: 65000, sale_price: 89000, mrp: 95000, garage_price: 85000, stock: 4, min_stock: 2, rack_location: 'C1-01', barcode: '8901234000059' },
  { part_no: 'TV-JUP-BAT', name: 'Jupiter Battery 5Ah', brand: 'TVS', category: 'electrical', hsn: '8507', gst_rate: 18, cost_price: 90000, sale_price: 125000, mrp: 135000, garage_price: 118000, stock: 5, min_stock: 2, rack_location: 'C2-02', barcode: '8901234000066' },
];

const insert = db.prepare(`
  INSERT INTO products
    (part_no, name, brand, category, hsn, gst_rate, cost_price, sale_price, mrp, garage_price, stock, min_stock, rack_location, barcode)
  VALUES
    (@part_no, @name, @brand, @category, @hsn, @gst_rate, @cost_price, @sale_price, @mrp, @garage_price, @stock, @min_stock, @rack_location, @barcode)
`);

const alreadySeeded = db.prepare('SELECT COUNT(*) AS n FROM products').get().n > 0;

if (alreadySeeded) {
  console.log('Products table already has data — skipping seed.');
} else {
  const seedAll = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  seedAll(sampleProducts);
  console.log(`Seeded ${sampleProducts.length} sample products.`);
}
