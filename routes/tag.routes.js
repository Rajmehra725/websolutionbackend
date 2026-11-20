import express from "express";
import { getTags, createTag, deleteTag } from "../controllers/tag.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getTags);
router.post("/", protect, adminOnly, createTag);
router.delete("/:id", protect, adminOnly, deleteTag);

export default router;
