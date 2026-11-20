import Media from "../models/media.model.js";
import Article from "../models/article.model.js";
import fs from "fs";
import path from "path";

/**
 * Admin: Get media list with search and pagination
 */
export const getMediaList = async (req, res) => {
  try {
    const { search, fileType, page = 1, limit = 24 } = req.query;
    const query = {};

    if (fileType) {
      query.fileType = fileType;
    }

    if (search && search.trim()) {
      query.$or = [
        { filename: { $regex: search.trim(), $options: "i" } },
        { originalName: { $regex: search.trim(), $options: "i" } },
        { altText: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 24));
    const skip = (pageNum - 1) * limitNum;

    const [media, total] = await Promise.all([
      Media.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Media.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      media,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Register an uploaded media file in DB
 */
export const registerMedia = async (req, res) => {
  try {
    const { url, filename, originalName = "", fileType = "image", mimeType = "", size = 0, altText = "" } = req.body;

    if (!url || !filename) {
      return res.status(400).json({ success: false, message: "URL and filename are required" });
    }

    const media = new Media({
      url,
      filename,
      originalName,
      fileType,
      mimeType,
      size,
      altText,
      uploadedBy: req.user._id,
    });

    await media.save();
    return res.status(201).json({ success: true, media });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Update media alt text
 */
export const updateMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { altText } = req.body;

    const media = await Media.findByIdAndUpdate(id, { altText: String(altText || "").trim() }, { new: true });
    if (!media) {
      return res.status(404).json({ success: false, message: "Media not found" });
    }

    return res.status(200).json({ success: true, media });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Delete media with reference safety check
 */
export const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await Media.findById(id);

    if (!media) {
      return res.status(404).json({ success: false, message: "Media not found" });
    }

    // Reference safety check: Check if any active article uses this image as coverImage
    const articleMatch = await Article.findOne({
      deletedAt: null,
      $or: [{ coverImage: media.url }, { content: { $regex: media.url, $options: "i" } }],
    }).select("title slug");

    if (articleMatch) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete media: It is currently used in article "${articleMatch.title}" (${articleMatch.slug}). Please replace it in the article first.`,
      });
    }

    // Try deleting physical local file if it resides in local uploads
    if (media.filename && !media.url.includes("cloudinary.com")) {
      const filePath = path.resolve("uploads", media.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn("Could not delete physical file:", e.message);
        }
      }
    }

    await Media.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Media deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
