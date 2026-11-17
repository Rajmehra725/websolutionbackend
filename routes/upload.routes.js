import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect } from "../middleware/auth.middleware.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Local Multer storage with timestamped filenames
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: localStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});

/**
 * Upload single media or document file (Cloudinary with local fallback)
 */
router.post("/single", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const host = req.get("host");
    const protocol = req.protocol;
    let fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    const mime = req.file.mimetype || "";
    let fileType = "file";
    if (mime.startsWith("image/")) fileType = "image";
    else if (mime.startsWith("video/")) fileType = "video";
    else if (mime.startsWith("audio/")) fileType = "audio";
    else if (mime.includes("pdf")) fileType = "pdf";

    // Attempt Cloudinary upload if configured
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      try {
        const resourceType = fileType === "video" ? "video" : fileType === "audio" ? "video" : "auto";
        const cldResult = await cloudinary.uploader.upload(req.file.path, {
          folder: "smileyx_media",
          resource_type: resourceType,
        });
        if (cldResult?.secure_url) {
          fileUrl = cldResult.secure_url;
        }
      } catch (cldErr) {
        console.warn("Cloudinary upload failed, using local storage fallback:", cldErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      file: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType,
        size: req.file.size,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
