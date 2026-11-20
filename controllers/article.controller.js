import Article from "../models/article.model.js";
import Category from "../models/category.model.js";
import Tag from "../models/tag.model.js";
import Author from "../models/author.model.js";
import AuditLog from "../models/auditLog.model.js";

/**
 * 1. Public: Get published articles (with filters, pagination, search)
 */
export const getPublicArticles = async (req, res) => {
  try {
    const {
      locale = "hi",
      category,
      tag,
      search,
      featured,
      trending,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {
      deletedAt: null,
      status: "published",
      publishedAt: { $lte: new Date() },
    };

    if (locale && (locale === "hi" || locale === "en")) {
      query.locale = locale;
    }

    if (featured === "true") {
      query.isFeatured = true;
    }

    if (trending === "true") {
      query.isTrending = true;
    }

    if (category) {
      const catDoc = await Category.findOne({ slug: category.toLowerCase() });
      if (catDoc) {
        query.category = catDoc._id;
      } else {
        return res.status(200).json({
          success: true,
          articles: [],
          total: 0,
          totalPages: 0,
          currentPage: Number(page),
        });
      }
    }

    if (tag) {
      const tagDoc = await Tag.findOne({ slug: tag.toLowerCase() });
      if (tagDoc) {
        query.tags = tagDoc._id;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { title: { $regex: term, $options: "i" } },
        { excerpt: { $regex: term, $options: "i" } },
        { content: { $regex: term, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sortOrder = trending === "true" ? { viewsCount: -1, publishedAt: -1 } : { publishedAt: -1 };

    const [articles, total] = await Promise.all([
      Article.find(query)
        .populate("category", "name nameHindi slug")
        .populate("author", "name nameHindi slug profileImage")
        .populate("tags", "name nameHindi slug")
        .select("-revisions")
        .sort(sortOrder)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Article.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      articles,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Public: Get single article by slug and locale
 */
export const getPublicArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { locale = "hi" } = req.query;

    const query = {
      slug: slug.toLowerCase(),
      deletedAt: null,
      status: "published",
    };

    if (locale) {
      query.locale = locale;
    }

    const article = await Article.findOne(query)
      .populate("category", "name nameHindi slug")
      .populate("author", "name nameHindi slug bio bioHindi profileImage socialLinks")
      .populate("tags", "name nameHindi slug")
      .select("-revisions");

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found or not published yet",
      });
    }

    // Atomically increment views count
    await Article.findByIdAndUpdate(article._id, { $inc: { viewsCount: 1 } });

    // Fetch translation if grouped
    let translation = null;
    if (article.translationGroupId) {
      translation = await Article.findOne({
        translationGroupId: article.translationGroupId,
        _id: { $ne: article._id },
        deletedAt: null,
        status: "published",
      })
        .select("title slug locale category")
        .populate("category", "slug")
        .lean();
    }

    return res.status(200).json({
      success: true,
      article,
      translation,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Public: Get related articles
 */
export const getRelatedArticles = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await Article.findById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }

    const related = await Article.find({
      _id: { $ne: current._id },
      category: current.category,
      locale: current.locale,
      status: "published",
      deletedAt: null,
    })
      .populate("category", "name nameHindi slug")
      .populate("author", "name nameHindi slug profileImage")
      .select("title slug excerpt coverImage readingTimeMinutes publishedAt category author")
      .sort({ publishedAt: -1 })
      .limit(4)
      .lean();

    return res.status(200).json({ success: true, articles: related });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Admin: List all articles (drafts, scheduled, published)
 */
export const getAdminArticles = async (req, res) => {
  try {
    const {
      status,
      category,
      locale,
      search,
      page = 1,
      limit = 15,
    } = req.query;

    const query = { deletedAt: null };

    if (status && ["draft", "submitted", "published", "scheduled", "archived"].includes(status)) {
      query.status = status;
    }

    if (locale && ["hi", "en"].includes(locale)) {
      query.locale = locale;
    }

    if (category) {
      query.category = category;
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { title: { $regex: term, $options: "i" } },
        { slug: { $regex: term, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 15));
    const skip = (pageNum - 1) * limitNum;

    const [articles, total] = await Promise.all([
      Article.find(query)
        .populate("category", "name nameHindi slug")
        .populate("author", "name nameHindi slug")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Article.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      articles,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Admin: Get single article with full revisions
 */
export const getAdminArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findById(id)
      .populate("category")
      .populate("author")
      .populate("tags")
      .populate("revisions.updatedBy", "fullName username");

    if (!article) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }

    return res.status(200).json({ success: true, article });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Admin: Create new article
 */
export const createArticle = async (req, res) => {
  try {
    const {
      title,
      slug,
      locale = "hi",
      excerpt = "",
      content,
      coverImage = "",
      coverImageAlt = "",
      author,
      category,
      subCategory,
      tags = [],
      status = "draft",
      isFeatured = false,
      isTrending = false,
      readingTimeMinutes = 4,
      scheduledAt = null,
      seo = {},
      translationGroupId = "",
    } = req.body;

    if (!title || !slug || !content || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, slug, content, and category are required",
      });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9\-]/g, "-").replace(/-+/g, "-");

    // Check slug collision in same locale for active articles
    const existing = await Article.findOne({
      slug: cleanSlug,
      locale,
      deletedAt: null,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An article with slug "${cleanSlug}" already exists in ${locale === "hi" ? "Hindi" : "English"}.`,
      });
    }

    const publishedAt = status === "published" ? new Date() : null;

    const article = new Article({
      title: title.trim(),
      slug: cleanSlug,
      locale,
      excerpt: excerpt.trim(),
      content,
      coverImage,
      coverImageAlt,
      author: author || null,
      category,
      subCategory: subCategory || null,
      tags,
      status,
      isFeatured,
      isTrending,
      readingTimeMinutes: readingTimeMinutes || Math.max(1, Math.ceil(content.split(/\s+/).length / 150)),
      scheduledAt: status === "scheduled" && scheduledAt ? new Date(scheduledAt) : null,
      publishedAt,
      seo: {
        metaTitle: seo.metaTitle || title,
        metaDescription: seo.metaDescription || excerpt,
        canonicalUrl: seo.canonicalUrl || "",
        ogImage: seo.ogImage || coverImage,
        noIndex: !!seo.noIndex,
        schemaType: seo.schemaType || "Article",
      },
      translationGroupId: translationGroupId || `group_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      revisions: [
        {
          title: title.trim(),
          content,
          excerpt: excerpt.trim(),
          summary: "Initial article draft creation",
          updatedBy: req.user._id,
        },
      ],
    });

    await article.save();

    // Increment category article count
    await Category.findByIdAndUpdate(category, { $inc: { articleCount: 1 } });
    if (author) {
      await Author.findByIdAndUpdate(author, { $inc: { articleCount: 1 } });
    }

    // Log action
    await AuditLog.create({
      admin: req.user._id,
      action: "ARTICLE_CREATED",
      targetType: "Article",
      targetId: article._id.toString(),
      details: { title: article.title, slug: article.slug, locale: article.locale, status: article.status },
      ipAddress: req.ip || "",
    });

    return res.status(201).json({
      success: true,
      message: "Article created successfully",
      article,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Admin: Update article with revision record
 */
export const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findById(id);

    if (!article || article.deletedAt) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }

    const {
      title,
      slug,
      locale,
      excerpt,
      content,
      coverImage,
      coverImageAlt,
      author,
      category,
      subCategory,
      tags,
      status,
      isFeatured,
      isTrending,
      readingTimeMinutes,
      scheduledAt,
      seo,
      revisionSummary = "Editorial changes saved",
    } = req.body;

    if (slug) {
      const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9\-]/g, "-").replace(/-+/g, "-");
      const existing = await Article.findOne({
        _id: { $ne: article._id },
        slug: cleanSlug,
        locale: locale || article.locale,
        deletedAt: null,
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `An article with slug "${cleanSlug}" already exists.`,
        });
      }
      article.slug = cleanSlug;
    }

    // Append to revision history if content or title changed
    if (content || title) {
      article.revisions.push({
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        summary: revisionSummary,
        updatedBy: req.user._id,
        createdAt: new Date(),
      });

      // Keep up to 25 revisions
      if (article.revisions.length > 25) {
        article.revisions.shift();
      }
    }

    if (title !== undefined) article.title = title.trim();
    if (locale !== undefined) article.locale = locale;
    if (excerpt !== undefined) article.excerpt = excerpt.trim();
    if (content !== undefined) article.content = content;
    if (coverImage !== undefined) article.coverImage = coverImage;
    if (coverImageAlt !== undefined) article.coverImageAlt = coverImageAlt;
    if (author !== undefined) article.author = author || null;
    if (category !== undefined) article.category = category;
    if (subCategory !== undefined) article.subCategory = subCategory || null;
    if (tags !== undefined) article.tags = tags;
    if (isFeatured !== undefined) article.isFeatured = isFeatured;
    if (isTrending !== undefined) article.isTrending = isTrending;
    if (readingTimeMinutes !== undefined) article.readingTimeMinutes = readingTimeMinutes;

    if (status !== undefined) {
      article.status = status;
      if (status === "published" && !article.publishedAt) {
        article.publishedAt = new Date();
      }
      if (status === "scheduled" && scheduledAt) {
        article.scheduledAt = new Date(scheduledAt);
      }
    }

    if (seo) {
      article.seo = {
        metaTitle: seo.metaTitle || article.seo?.metaTitle || article.title,
        metaDescription: seo.metaDescription || article.seo?.metaDescription || article.excerpt,
        canonicalUrl: seo.canonicalUrl || article.seo?.canonicalUrl || "",
        ogImage: seo.ogImage || article.seo?.ogImage || article.coverImage,
        noIndex: seo.noIndex !== undefined ? seo.noIndex : (article.seo?.noIndex || false),
        schemaType: seo.schemaType || article.seo?.schemaType || "Article",
      };
    }

    await article.save();

    await AuditLog.create({
      admin: req.user._id,
      action: "ARTICLE_UPDATED",
      targetType: "Article",
      targetId: article._id.toString(),
      details: { title: article.title, slug: article.slug, status: article.status },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({
      success: true,
      message: "Article updated successfully",
      article,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. Admin: Delete article (soft delete safeguard)
 */
export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }

    if (permanent === "true") {
      await Article.findByIdAndDelete(id);
      await Category.findByIdAndUpdate(article.category, { $inc: { articleCount: -1 } });
      if (article.author) {
        await Author.findByIdAndUpdate(article.author, { $inc: { articleCount: -1 } });
      }
    } else {
      article.deletedAt = new Date();
      article.status = "archived";
      await article.save();
    }

    await AuditLog.create({
      admin: req.user._id,
      action: permanent === "true" ? "ARTICLE_PERMANENTLY_DELETED" : "ARTICLE_SOFT_DELETED",
      targetType: "Article",
      targetId: id,
      details: { title: article.title, slug: article.slug },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({
      success: true,
      message: permanent === "true" ? "Article permanently deleted" : "Article archived and moved to trash",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 9. Admin: Duplicate article
 */
export const duplicateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const source = await Article.findById(id).lean();
    if (!source) {
      return res.status(404).json({ success: false, message: "Source article not found" });
    }

    delete source._id;
    delete source.createdAt;
    delete source.updatedAt;

    source.title = `${source.title} (Copy)`;
    source.slug = `${source.slug}-copy-${Date.now().toString().slice(-4)}`;
    source.status = "draft";
    source.publishedAt = null;
    source.scheduledAt = null;
    source.viewsCount = 0;
    source.revisions = [
      {
        title: source.title,
        content: source.content,
        excerpt: source.excerpt,
        summary: `Cloned from article: ${source.slug}`,
        updatedBy: req.user._id,
      },
    ];

    const duplicate = new Article(source);
    await duplicate.save();

    return res.status(201).json({
      success: true,
      message: "Article duplicated successfully as draft",
      article: duplicate,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 10. Admin: Restore previous version from revision history
 */
export const restoreRevision = async (req, res) => {
  try {
    const { id, revisionId } = req.params;
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }

    const revision = article.revisions.id(revisionId);
    if (!revision) {
      return res.status(404).json({ success: false, message: "Revision version not found" });
    }

    // Save current state before restoring
    article.revisions.push({
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      summary: `Pre-restore snapshot before restoring version from ${revision.createdAt}`,
      updatedBy: req.user._id,
    });

    article.title = revision.title;
    article.content = revision.content;
    article.excerpt = revision.excerpt;

    await article.save();

    return res.status(200).json({
      success: true,
      message: "Revision restored successfully",
      article,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
