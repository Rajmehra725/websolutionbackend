import express from "express";
import {
  getPublicArticles,
  getPublicArticleBySlug,
  getRelatedArticles,
  getAdminArticles,
  getAdminArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  duplicateArticle,
  restoreRevision,
} from "../controllers/article.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getPublicArticles);
router.get("/slug/:slug", getPublicArticleBySlug);
router.get("/related/:id", getRelatedArticles);

// Admin routes
router.get("/admin/list", protect, adminOnly, getAdminArticles);
router.get("/admin/:id", protect, adminOnly, getAdminArticleById);
router.post("/", protect, adminOnly, createArticle);
router.put("/:id", protect, adminOnly, updateArticle);
router.delete("/:id", protect, adminOnly, deleteArticle);
router.post("/:id/duplicate", protect, adminOnly, duplicateArticle);
router.post("/:id/restore-revision/:revisionId", protect, adminOnly, restoreRevision);

export default router;
