import Setting from "../models/setting.model.js";
import Article from "../models/article.model.js";
import Category from "../models/category.model.js";
import Author from "../models/author.model.js";
import Media from "../models/media.model.js";
import AuditLog from "../models/auditLog.model.js";

/**
 * Public: Get site branding & public configuration
 */
export const getPublicSiteSettings = async (req, res) => {
  try {
    const settings = await Setting.find({
      category: { $in: ["general", "features"] },
    }).lean();

    const configMap = {};
    settings.forEach((s) => {
      configMap[s.key] = s.value;
    });

    return res.status(200).json({
      success: true,
      settings: {
        siteName: configMap.SITE_NAME || "RAAZ",
        tagline: configMap.SITE_TAGLINE || "ज्ञान का आसान समाधान",
        defaultLocale: configMap.DEFAULT_LOCALE || "hi",
        googleAnalyticsId: configMap.GA4_MEASUREMENT_ID || "",
        googleSearchConsoleVerification: configMap.GSC_VERIFICATION || "",
        adsenseEnabled: !!configMap.ADSENSE_ENABLED,
        adsensePublisherId: configMap.ADSENSE_PUBLISHER_ID || "",
        contactEmail: configMap.CONTACT_EMAIL || "contact@raaz.in",
        socialLinks: {
          twitter: configMap.SOCIAL_TWITTER || "",
          youtube: configMap.SOCIAL_YOUTUBE || "",
          instagram: configMap.SOCIAL_INSTAGRAM || "",
          facebook: configMap.SOCIAL_FACEBOOK || "",
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Get all settings
 */
export const getAdminSiteSettings = async (req, res) => {
  try {
    const settings = await Setting.find().sort({ category: 1, key: 1 }).lean();
    return res.status(200).json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Update site settings batch
 */
export const updateAdminSiteSettings = async (req, res) => {
  try {
    const { settings = [] } = req.body;

    for (const item of settings) {
      if (item.key) {
        await Setting.findOneAndUpdate(
          { key: item.key.toUpperCase() },
          {
            value: item.value,
            type: item.type || "string",
            description: item.description || "",
            category: item.category || "general",
            updatedBy: req.user._id,
          },
          { upsert: true }
        );
      }
    }

    await AuditLog.create({
      admin: req.user._id,
      action: "SITE_SETTINGS_UPDATED",
      targetType: "Setting",
      details: { count: settings.length },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({ success: true, message: "Settings updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: CMS Dashboard Metrics
 */
export const getCmsDashboardStats = async (req, res) => {
  try {
    const [
      publishedCount,
      draftCount,
      scheduledCount,
      archivedCount,
      categoryCount,
      authorCount,
      mediaCount,
      totalViewsAgg,
      recentArticles,
      recentAuditLogs,
    ] = await Promise.all([
      Article.countDocuments({ status: "published", deletedAt: null }),
      Article.countDocuments({ status: "draft", deletedAt: null }),
      Article.countDocuments({ status: "scheduled", deletedAt: null }),
      Article.countDocuments({ status: "archived" }),
      Category.countDocuments(),
      Author.countDocuments(),
      Media.countDocuments(),
      Article.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: null, totalViews: { $sum: "$viewsCount" } } },
      ]),
      Article.find({ deletedAt: null })
        .populate("category", "name nameHindi slug")
        .populate("author", "name nameHindi slug")
        .select("title slug status locale viewsCount publishedAt updatedAt")
        .sort({ updatedAt: -1 })
        .limit(6)
        .lean(),
      AuditLog.find()
        .populate("admin", "fullName username")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    const totalViews = totalViewsAgg[0]?.totalViews || 0;

    return res.status(200).json({
      success: true,
      stats: {
        publishedCount,
        draftCount,
        scheduledCount,
        archivedCount,
        totalArticles: publishedCount + draftCount + scheduledCount,
        categoryCount,
        authorCount,
        mediaCount,
        totalViews,
      },
      recentArticles,
      recentAuditLogs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
