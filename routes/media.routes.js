import express from "express";
import {
  getMediaList,
  registerMedia,
  updateMedia,
  deleteMedia,
} from "../controllers/media.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, adminOnly, getMediaList);
router.post("/register", protect, adminOnly, registerMedia);
router.put("/:id", protect, adminOnly, updateMedia);
router.delete("/:id", protect, adminOnly, deleteMedia);

export default router;
