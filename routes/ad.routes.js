import express from "express";
import {
  getPublicAdConfig,
  getAdminAdPlacements,
  updateAdPlacement,
  updateGlobalAdConfig,
  getAdsTxt,
} from "../controllers/ad.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.get("/public-config", getPublicAdConfig);
router.get("/ads.txt", getAdsTxt);

// Admin
router.get("/", protect, adminOnly, getAdminAdPlacements);
router.put("/global", protect, adminOnly, updateGlobalAdConfig);
router.put("/placement/:key", protect, adminOnly, updateAdPlacement);

export default router;
