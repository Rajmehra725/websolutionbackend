import express from "express";
import {
  getPublicSiteSettings,
  getAdminSiteSettings,
  updateAdminSiteSettings,
  getCmsDashboardStats,
} from "../controllers/siteSetting.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/public", getPublicSiteSettings);
router.get("/", protect, adminOnly, getAdminSiteSettings);
router.put("/", protect, adminOnly, updateAdminSiteSettings);
router.get("/stats", protect, adminOnly, getCmsDashboardStats);

export default router;
