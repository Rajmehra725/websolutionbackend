import mongoose from "mongoose";

const revisionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    excerpt: { type: String, default: "" },
    summary: { type: String, default: "Article update" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    locale: {
      type: String,
      enum: ["hi", "en"],
      default: "hi",
      index: true,
    },
    excerpt: {
      type: String,
      default: "",
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
      default: "",
    },
    coverImageAlt: {
      type: String,
      default: "",
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Author",
      default: null,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],
    status: {
      type: String,
      enum: ["draft", "submitted", "published", "scheduled", "archived"],
      default: "draft",
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isTrending: {
      type: Boolean,
      default: false,
      index: true,
    },
    readingTimeMinutes: {
      type: Number,
      default: 4,
    },
    viewsCount: {
      type: Number,
      default: 0,
      index: true,
    },
    scheduledAt: {
      type: Date,
      default: null,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      canonicalUrl: { type: String, default: "" },
      ogImage: { type: String, default: "" },
      noIndex: { type: Boolean, default: false },
      schemaType: { type: String, default: "Article" },
    },
    translationGroupId: {
      type: String,
      default: "",
      index: true,
    },
    revisions: [revisionSchema],
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for uniqueness across active articles per locale
articleSchema.index({ slug: 1, locale: 1, deletedAt: 1 }, { unique: true });
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ category: 1, status: 1, publishedAt: -1 });
articleSchema.index({ title: "text", excerpt: "text", content: "text" });

const Article =
  mongoose.models.Article || mongoose.model("Article", articleSchema);

export default Article;
