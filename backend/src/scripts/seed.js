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

  await mongoose.connection.close();
  console.log("\n🎉 Seed complete!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
