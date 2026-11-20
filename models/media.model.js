import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      default: "",
    },
    fileType: {
      type: String,
      enum: ["image", "video", "audio", "pdf", "file"],
      default: "image",
    },
    mimeType: {
      type: String,
      default: "",
    },
    size: {
      type: Number,
      default: 0,
    },
    altText: {
      type: String,
      default: "",
      trim: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

mediaSchema.index({ createdAt: -1 });

const Media = mongoose.models.Media || mongoose.model("Media", mediaSchema);

export default Media;
