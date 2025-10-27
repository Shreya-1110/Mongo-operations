// catalog.js
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ecommerceDB";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  variants: [
    {
      sku: { type: String, required: true },
      color: { type: String, required: true },
      size: { type: mongoose.Schema.Types.Mixed }, // strings like "M" or numbers for shoe sizes
      stock: { type: Number, required: true, min: 0 }
    }
  ]
}, { versionKey: false });

const Product = mongoose.model("Product", productSchema);

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Connected to MongoDB:", MONGO_URI);

  // Seed sample data if collection is empty
  const count = await Product.countDocuments();
  if (count === 0) {
    console.log("Seeding sample products...");
    await Product.insertMany([
      {
        name: "Classic Tee",
        price: 799,
        category: "Apparel",
        variants: [
          { sku: "CT-RED-S", color: "Red", size: "S", stock: 12 },
          { sku: "CT-RED-M", color: "Red", size: "M", stock: 8 },
          { sku: "CT-BLK-L", color: "Black", size: "L", stock: 5 }
        ]
      },
      {
        name: "Running Shoes",
        price: 3499,
        category: "Footwear",
        variants: [
          { sku: "RS-BL-9", color: "Blue", size: 9, stock: 7 },
          { sku: "RS-BK-10", color: "Black", size: 10, stock: 4 }
        ]
      },
      {
        name: "Denim Jacket",
        price: 2599,
        category: "Apparel",
        variants: [
          { sku: "DJ-LT-M", color: "Light Blue", size: "M", stock: 3 },
          { sku: "DJ-DK-L", color: "Dark Blue", size: "L", stock: 6 }
        ]
      }
    ]);
  } else {
    console.log("Products already seeded (count =", count + ")");
  }

  // 1) Retrieve all products
  const all = await Product.find();
  console.log("\n=== All products ===");
  console.dir(all, { depth: 3 });

  // 2) Filter by category "Apparel"
  const apparel = await Product.find({ category: "Apparel" });
  console.log("\n=== Apparel products ===");
  console.dir(apparel, { depth: 3 });

  // 3) Project specific variant details (name + variants.color + variants.stock)
  const projected = await Product.find({}, { name: 1, "variants.color": 1, "variants.stock": 1, _id: 0 });
  console.log("\n=== Projected (name + variant color/stock) ===");
  console.dir(projected, { depth: 3 });

  // 4) Find products having a variant color "Red"
  const redProducts = await Product.find({ "variants.color": "Red" });
  console.log("\n=== Products with variant color = Red ===");
  console.dir(redProducts, { depth: 3 });

  // 5) Show only the matched variant using $elemMatch (mongoose projection)
  const redMatch = await Product.find(
    { "variants.color": "Red" },
    { name: 1, variants: { $elemMatch: { color: "Red" } } }
  );
  console.log("\n=== Products with matched variant (elemMatch) ===");
  console.dir(redMatch, { depth: 3 });

  // 6) Update nested variant stock: decrement CT-RED-S by 1
  const upd = await Product.updateOne(
    { "variants.sku": "CT-RED-S" },
    { $inc: { "variants.$.stock": -1 } }
  );
  console.log("\nUpdated CT-RED-S stock (updateOne):", upd);

  // 7) Push a new variant into Running Shoes
  const pushRes = await Product.updateOne(
    { name: "Running Shoes" },
    { $push: { variants: { sku: "RS-WH-8", color: "White", size: 8, stock: 10 } } }
  );
  console.log("\nPushed new variant to Running Shoes:", pushRes);

  // 8) Remove a variant from Denim Jacket by SKU
  const pullRes = await Product.updateOne(
    { name: "Denim Jacket" },
    { $pull: { variants: { sku: "DJ-LT-M" } } }
  );
  console.log("\nPulled variant DJ-LT-M from Denim Jacket:", pullRes);

  // 9) Show final state of Running Shoes and Denim Jacket
  const final = await Product.find({ name: { $in: ["Running Shoes", "Denim Jacket"] } });
  console.log("\n=== Final state (Running Shoes & Denim Jacket) ===");
  console.dir(final, { depth: 3 });

  await mongoose.disconnect();
  console.log("\nDisconnected. Done.");
  process.exit(0);
}

main().catch(err => {
  console.error("Error in script:", err);
  process.exit(1);
});
