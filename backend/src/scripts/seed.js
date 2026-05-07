import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import User from "../modules/user/user.model.js";
import Organization from "../modules/organization/organization.model.js";
import Category from "../modules/category/category.model.js";

const SUPER_ADMIN = {
  name: "Super Admin",
  email: "admin@stockkart.com",
  password: "Admin@123456",
  role: "superAdmin",
};

const STORE_SEEDS = [
  {
    storeType: "electronics",
    storeName: "TechHub Electronics",
    email: "admin@techhub.demo",
    categories: [
      "Smartphones & Tablets",
      "Laptops & Computers",
      "TV & Home Theater",
      "Audio & Headphones",
      "Cameras & Photography",
      "Gaming Consoles & Accessories",
      "Smart Home Devices",
      "Computer Accessories & Peripherals",
      "Printers & Scanners",
      "Networking Equipment",
      "Wearables & Smartwatches",
      "Power Banks & Chargers",
      "Storage Devices",
      "Projectors & Displays",
    ],
  },
  {
    storeType: "electrical",
    storeName: "PowerLine Electricals",
    email: "admin@powerline.demo",
    categories: [
      "Wiring & Cables",
      "Switches & Sockets",
      "Circuit Breakers & MCBs",
      "LED Lights & Bulbs",
      "Fans & Ventilation",
      "Water Pumps & Motors",
      "Distribution Boards & Panels",
      "Conduits & Pipe Fittings",
      "Power Plugs & Extensions",
      "Transformers & Stabilizers",
      "Solar & Inverter Components",
      "Safety Equipment & PPE",
      "Tools & Testing Instruments",
      "CCTV & Security Systems",
      "Earthing & Lightning Protection",
    ],
  },
  {
    storeType: "pharmacy",
    storeName: "MediCare Pharmacy",
    email: "admin@medicare.demo",
    categories: [
      "Prescription Medicines",
      "OTC Medicines",
      "Vitamins & Supplements",
      "First Aid & Wound Care",
      "Baby Care & Pediatrics",
      "Personal Care & Hygiene",
      "Diabetic Care",
      "Cardiac & Blood Pressure",
      "Ayurvedic & Herbal",
      "Medical Devices & Equipment",
      "Surgical Supplies",
      "Skincare & Dermatology",
      "Eye & Ear Care",
      "Orthopedic & Pain Relief",
    ],
  },
  {
    storeType: "grocery",
    storeName: "FreshMart Grocery",
    email: "admin@freshmart.demo",
    categories: [
      "Rice, Wheat & Grains",
      "Pulses & Lentils",
      "Cooking Oils & Ghee",
      "Spices & Condiments",
      "Snacks & Namkeen",
      "Beverages & Juices",
      "Dairy Products",
      "Packaged & Instant Foods",
      "Biscuits & Bakery",
      "Home Cleaners & Detergents",
      "Dry Fruits & Nuts",
      "Sugar & Sweeteners",
      "Tea, Coffee & Health Drinks",
      "Personal Care",
      "Baby Products",
    ],
  },
  {
    storeType: "clothing",
    storeName: "StyleHub Clothing",
    email: "admin@stylehub.demo",
    categories: [
      "Men's Shirts & T-Shirts",
      "Men's Trousers & Jeans",
      "Women's Ethnic Wear",
      "Women's Western Wear",
      "Kids' Clothing",
      "Innerwear & Socks",
      "Winterwear & Jackets",
      "Sports & Activewear",
      "Footwear",
      "Accessories & Belts",
      "School Uniforms",
      "Nightwear & Loungewear",
      "Wedding & Festive Wear",
    ],
  },
  {
    storeType: "general",
    storeName: "QuickMart General Store",
    email: "admin@quickmart.demo",
    categories: [
      "Stationery & Office Supplies",
      "Cleaning & Household",
      "Kitchen & Cookware",
      "Food & Beverages",
      "Personal Care",
      "Toys & Games",
      "Sports & Fitness",
      "Electrical Accessories",
      "Clothing & Apparel",
      "Health & Wellness",
      "Baby Products",
      "Seasonal Items",
    ],
  },
];

async function seed() {
  console.log("🔌 Connecting to MongoDB Atlas…");
  await mongoose.connect(env.MONGO_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 10000 });
  console.log("✅ Connected\n");

  // -- SuperAdmin --
  const existingAdmin = await User.findOne({ email: SUPER_ADMIN.email });
  if (!existingAdmin) {
    await User.create(SUPER_ADMIN);
    console.log(`✅ SuperAdmin created`);
    console.log(`   Email   : ${SUPER_ADMIN.email}`);
    console.log(`   Password: ${SUPER_ADMIN.password}\n`);
  } else {
    console.log(`⏭  SuperAdmin already exists (${SUPER_ADMIN.email})\n`);
  }

  // -- Demo orgs + categories --
  for (const seed of STORE_SEEDS) {
    let org = await Organization.findOne({ email: seed.email });

    if (!org) {
      org = await Organization.create({
        name: seed.storeName,
        storeName: seed.storeName,
        storeType: seed.storeType,
        email: seed.email,
        currency: "INR",
        currencySymbol: "₹",
      });
      console.log(`✅ [${seed.storeType.padEnd(11)}] ${seed.storeName}`);
    } else {
      console.log(`⏭  [${seed.storeType.padEnd(11)}] ${seed.storeName} (exists)`);
    }

    let added = 0;
    for (const name of seed.categories) {
      const exists = await Category.findOne({ name, organizationId: org._id });
      if (!exists) {
        await Category.create({ name, organizationId: org._id });
        added++;
      }
    }
    if (added > 0) console.log(`   📂 ${added} categories seeded`);
  }

  await mongoose.connection.close();
  console.log("\n🎉 Seed complete!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
