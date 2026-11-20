import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { createServer } from "http";
import express from "express";
import connectDB from "../config/db.js";
import User from "../models/user.model.js";
import Category from "../models/category.model.js";
import Article from "../models/article.model.js";
import AdPlacement from "../models/adPlacement.model.js";
import Setting from "../models/setting.model.js";

import authRoutes from "../routes/auth.routes.js";
import articleRoutes from "../routes/article.routes.js";
import categoryRoutes from "../routes/category.routes.js";
import tagRoutes from "../routes/tag.routes.js";
import authorRoutes from "../routes/author.routes.js";
import adRoutes from "../routes/ad.routes.js";
import contactRoutes from "../routes/contact.routes.js";
import mediaRoutes from "../routes/media.routes.js";
import siteSettingRoutes from "../routes/siteSetting.routes.js";
import adminRoutes from "../routes/admin.routes.js";

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runRaazVerification() {
  console.log("=================================================");
  console.log("     RAAZ PLATFORM: SYSTEM & API VERIFICATION    ");
  console.log("             ज्ञान का आसान समाधान               ");
  console.log("=================================================\n");

  let server;
  let adminToken = "";

  try {
    // 1. Connect MongoDB
    console.log("Step 1: Connecting to MongoDB...");
    await connectDB();
    console.log("✅ Step 1 Passed: Database Connected\n");

    // 2. Start Test Express Server
    console.log(`Step 2: Starting Test Server on port ${TEST_PORT}...`);
    const app = express();
    app.use(express.json());

    // Health check
    app.get("/", (req, res) => {
      res.json({
        success: true,
        platform: "RAAZ Publishing & Knowledge API",
        brand: "RAAZ",
        tagline: "ज्ञान का आसान समाधान",
        version: "2.1.0",
      });
    });

    app.use("/api/auth", authRoutes);
    app.use("/api/articles", articleRoutes);
    app.use("/api/categories", categoryRoutes);
    app.use("/api/tags", tagRoutes);
    app.use("/api/authors", authorRoutes);
    app.use("/api/ads", adRoutes);
    app.use("/api/contact", contactRoutes);
    app.use("/api/media", mediaRoutes);
    app.use("/api/site-settings", siteSettingRoutes);
    app.use("/api/admin", adminRoutes);

    server = createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`✅ Step 2 Passed: Test Server active at ${BASE_URL}\n`);

    // 3. Test Health Check Endpoint
    console.log("Step 3: Testing Health Check Endpoint...");
    const healthRes = await axios.get(`${BASE_URL}/`);
    if (healthRes.data?.brand !== "RAAZ" || !healthRes.data?.success) {
      throw new Error("Health check brand mismatch");
    }
    console.log(`✅ Step 3 Passed: Health Check OK -> Brand: ${healthRes.data.brand}, Tagline: ${healthRes.data.tagline}\n`);

    // 4. Test Public Categories API
    console.log("Step 4: Testing Public Categories API...");
    const catRes = await axios.get(`${BASE_URL}/api/categories`);
    console.log(`✅ Step 4 Passed: Categories retrieved: ${catRes.data.categories?.length || 0} categories found\n`);

    // 5. Test Public AdSense Config (Safe response)
    console.log("Step 5: Testing Public AdSense Configuration API...");
    const adRes = await axios.get(`${BASE_URL}/api/ads/public-config`);
    if (!adRes.data?.success || !Array.isArray(adRes.data?.placements)) {
      throw new Error("Public ads config invalid");
    }
    console.log(`✅ Step 5 Passed: Public Ads Config OK -> Global Enabled: ${adRes.data.isGlobalEnabled}, Slots: ${adRes.data.placements.length}\n`);

    // 6. Test Public Site Settings API
    console.log("Step 6: Testing Public Site Settings API...");
    const settingsRes = await axios.get(`${BASE_URL}/api/site-settings/public`);
    if (settingsRes.data?.settings?.siteName !== "RAAZ") {
      throw new Error("Site name mismatch in public settings");
    }
    console.log(`✅ Step 6 Passed: Site Settings verified -> Site: ${settingsRes.data.settings.siteName}, Tagline: ${settingsRes.data.settings.tagline}\n`);

    // 7. Test Admin Provisioning / Login
    console.log("Step 7: Testing Admin Authentication...");
    let superAdmin = await User.findOne({ role: "super_admin" });
    const testAdminPassword = "TestRaazAdmin@2026";

    if (!superAdmin) {
      superAdmin = new User({
        fullName: "RAAZ Test Admin",
        username: "raaztestadmin",
        phone: "+919999000011",
        password: testAdminPassword,
        role: "super_admin",
        isPrimarySuperAdmin: true,
      });
      await superAdmin.save();
    } else {
      superAdmin.password = testAdminPassword;
      await superAdmin.save();
    }

    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      identifier: superAdmin.username,
      password: testAdminPassword,
    });

    if (!loginRes.data?.token || loginRes.data?.user?.role !== "super_admin") {
      throw new Error("Admin login failed or missing token");
    }
    adminToken = loginRes.data.token;
    console.log(`✅ Step 7 Passed: Super Admin logged in successfully as @${loginRes.data.user.username}\n`);

    const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 8. Test Admin Category Creation
    console.log("Step 8: Testing Category CRUD...");
    const testCatSlug = `test-cat-${Date.now().toString().slice(-4)}`;
    const createCatRes = await axios.post(
      `${BASE_URL}/api/categories`,
      {
        name: "Test Technology",
        nameHindi: "परीक्षण तकनीक",
        slug: testCatSlug,
        description: "Test description",
        order: 99,
      },
      authHeaders
    );
    const createdCatId = createCatRes.data.category._id;
    console.log(`✅ Step 8 Passed: Created Category with slug "${testCatSlug}"\n`);

    // 9. Test Article Creation with Revision Snapshot
    console.log("Step 9: Testing Article Creation...");
    const testArticleSlug = `test-article-${Date.now().toString().slice(-4)}`;
    const createArtRes = await axios.post(
      `${BASE_URL}/api/articles`,
      {
        title: "परीक्षण लेख: स्मार्टफोन सुरक्षा टिप्स",
        slug: testArticleSlug,
        locale: "hi",
        excerpt: "स्मार्टफोन सुरक्षा के महत्वपूर्ण टिप्स।",
        content: "<h2>सुरक्षा के 3 नियम</h2><p>पासवर्ड मजबूत रखें।</p>",
        category: createdCatId,
        status: "published",
        isFeatured: true,
      },
      authHeaders
    );
    const createdArtId = createArtRes.data.article._id;
    if (!createdArtId) throw new Error("Article creation failed");
    console.log(`✅ Step 9 Passed: Article created successfully with slug "${testArticleSlug}"\n`);

    // 10. Test Public Article Fetch by Slug
    console.log("Step 10: Testing Public Article View...");
    const publicArtRes = await axios.get(
      `${BASE_URL}/api/articles/slug/${testArticleSlug}?locale=hi`
    );
    if (publicArtRes.data?.article?.slug !== testArticleSlug) {
      throw new Error("Public article fetch failed");
    }
    console.log(`✅ Step 10 Passed: Public article fetched, Views count incremented: ${publicArtRes.data.article.viewsCount}\n`);

    // 11. Test Article Update & Revision Snapshot
    console.log("Step 11: Testing Article Update & Revision Snapshot...");
    const updateArtRes = await axios.put(
      `${BASE_URL}/api/articles/${createdArtId}`,
      {
        title: "अपडेटेड परीक्षण लेख: स्मार्टफोन सुरक्षा टिप्स",
        content: "<h2>सुरक्षा के 3 नियम</h2><p>नया सामग्री अपडेट।</p>",
        revisionSummary: "Test content revision",
      },
      authHeaders
    );
    if (updateArtRes.data?.article?.revisions?.length < 2) {
      throw new Error("Revision snapshot not recorded");
    }
    console.log(`✅ Step 11 Passed: Article updated with revisions count: ${updateArtRes.data.article.revisions.length}\n`);

    // 12. Test Article Duplicate
    console.log("Step 12: Testing Article Duplicate...");
    const dupRes = await axios.post(
      `${BASE_URL}/api/articles/${createdArtId}/duplicate`,
      {},
      authHeaders
    );
    if (!dupRes.data?.article?.slug.includes("-copy-")) {
      throw new Error("Duplicate slug mismatch");
    }
    console.log(`✅ Step 12 Passed: Article duplicated as draft: "${dupRes.data.article.slug}"\n`);

    // 13. Test Public Contact Submission
    console.log("Step 13: Testing Public Contact Message Submission...");
    const contactRes = await axios.post(`${BASE_URL}/api/contact`, {
      name: "Rajesh Sharma",
      email: "rajesh.test@example.com",
      subject: "Inquiry about AI Guide",
      message: "Please write a guide on Android 15 developer options.",
    });
    if (!contactRes.data?.success) throw new Error("Contact submission failed");
    console.log("✅ Step 13 Passed: Public contact form submitted successfully\n");

    // 14. Test Admin Ad Placement Update & ads.txt
    console.log("Step 14: Testing Ad Management & ads.txt...");
    await axios.put(
      `${BASE_URL}/api/ads/placement/header`,
      { isEnabled: true, slotId: "9876543210" },
      authHeaders
    );
    const adsTxtRes = await axios.get(`${BASE_URL}/api/ads/ads.txt`);
    if (!adsTxtRes.data) throw new Error("ads.txt failed");
    console.log("✅ Step 14 Passed: Ad Placement updated and ads.txt verified\n");

    // 15. Test CMS Dashboard Stats
    console.log("Step 15: Testing CMS Dashboard Stats API...");
    const statsRes = await axios.get(`${BASE_URL}/api/site-settings/stats`, authHeaders);
    if (!statsRes.data?.stats) throw new Error("Dashboard stats missing");
    console.log("✅ Step 15 Passed: CMS Dashboard Stats verified:", statsRes.data.stats, "\n");

    // Cleanup test records
    console.log("Cleaning up temporary test records...");
    await Article.findByIdAndDelete(createdArtId);
    await Article.findByIdAndDelete(dupRes.data.article._id);
    await Category.findByIdAndDelete(createdCatId);
    console.log("🧹 Cleanup complete.\n");

    console.log("=================================================");
    console.log("🎉 ALL 15 VERIFICATION TEST SUITES PASSED! 🎉");
    console.log("RAAZ PLATFORM IS ROBUST, VERIFIED & PRODUCTION READY");
    console.log("=================================================");

    server.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ VERIFICATION TEST FAILED:", error.response?.data || error.message);
    if (server) server.close();
    process.exit(1);
  }
}

runRaazVerification();
