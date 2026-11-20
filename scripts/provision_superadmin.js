import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/user.model.js";
import AuditLog from "../models/auditLog.model.js";

async function provisionSuperAdmin() {
  try {
    await connectDB();
    console.log("Connected to MongoDB for Super Admin provisioning.");

    const targetUsername = (
      process.argv[2] ||
      process.env.SUPERADMIN_USERNAME ||
      "raazadmin"
    )
      .toLowerCase()
      .replace(/^@+/, "");
    const defaultPassword =
      process.argv[3] || process.env.SUPERADMIN_PASSWORD || "RaazAdmin@2026";
    const defaultPhone = process.env.SUPERADMIN_PHONE || "+919876543210";
    const defaultEmail = process.env.SUPERADMIN_EMAIL || "admin@raaz.in";

    let adminUser = await User.findOne({
      $or: [
        { username: targetUsername },
        { email: defaultEmail },
        { phone: defaultPhone },
      ],
    });

    if (adminUser) {
      adminUser.role = "super_admin";
      adminUser.isPrimarySuperAdmin = true;
      adminUser.isBanned = false;
      adminUser.isSuspended = false;
      adminUser.password = defaultPassword; // Trigger bcrypt hash pre-save
      await adminUser.save();

      console.log(
        `✅ Updated existing user @${adminUser.username} (${adminUser.phone}) as SUPER ADMIN with updated password.`
      );

      await AuditLog.create({
        admin: adminUser._id,
        action: "PROVISION_SUPER_ADMIN",
        targetType: "User",
        targetId: adminUser._id.toString(),
        details: {
          username: adminUser.username,
          note: "Super admin role & password updated",
        },
        ipAddress: "127.0.0.1",
      });
    } else {
      adminUser = new User({
        fullName: "RAAZ Platform Administrator",
        username: targetUsername,
        phone: defaultPhone,
        email: defaultEmail,
        password: defaultPassword,
        role: "super_admin",
        isPrimarySuperAdmin: true,
        bio: "Chief Administrator for RAAZ Publishing Platform.",
      });

      await adminUser.save();
      console.log(
        `✅ Created new Super Admin account: @${targetUsername} (${defaultPhone})`
      );

      await AuditLog.create({
        admin: adminUser._id,
        action: "PROVISION_SUPER_ADMIN",
        targetType: "User",
        targetId: adminUser._id.toString(),
        details: {
          username: targetUsername,
          note: "Initial super admin bootstrap created",
        },
        ipAddress: "127.0.0.1",
      });
    }

    console.log("Provisioning complete. Closing connection.");
    process.exit(0);
  } catch (error) {
    console.error("Provisioning failed:", error);
    process.exit(1);
  }
}

provisionSuperAdmin();
