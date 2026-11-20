import mongoose from "mongoose";

const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameHindi: {
      type: String,
      default: "",
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    bio: {
      type: String,
      default: "",
    },
    bioHindi: {
      type: String,
      default: "",
    },
    profileImage: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    socialLinks: {
      twitter: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      github: { type: String, default: "" },
      website: { type: String, default: "" },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    articleCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Author =
  mongoose.models.Author || mongoose.model("Author", authorSchema);

export default Author;
