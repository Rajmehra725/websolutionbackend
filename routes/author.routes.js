import express from "express";
import {
  getAuthors,
  getAuthorBySlug,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} from "../controllers/author.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAuthors);
router.get("/:slug", getAuthorBySlug);

router.post("/", protect, adminOnly, createAuthor);
router.put("/:id", protect, adminOnly, updateAuthor);
router.delete("/:id", protect, adminOnly, deleteAuthor);

export default router;
