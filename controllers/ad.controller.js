import AdPlacement from "../models/adPlacement.model.js";
import Setting from "../models/setting.model.js";
import AuditLog from "../models/auditLog.model.js";

const DEFAULT_PLACEMENTS = [
  { key: "header", name: "Header Ad Banner", format: "horizontal" },
  { key: "article_top", name: "Article Top (Below Title)", format: "rectangle" },
  { key: "article_middle", name: "Article In-Feed (Mid Content)", format: "rectangle" },
  { key: "article_bottom", name: "Article Bottom (Above Author)", format: "horizontal" },
  { key: "sidebar", name: "Sidebar Desktop Sticky Ad", format: "vertical" },
  { key: "footer", name: "Footer Ad Banner", format: "horizontal" },
];

export const ensureDefaultAdPlacements = async () => {
  for (const item of DEFAULT_PLACEMENTS) {
    const existing = await AdPlacement.findOne({ key: item.key });
    if (!existing) {
      await AdPlacement.create({
        key: item.key,
        name: item.name,
        format: item.format,
        isEnabled: false,
        slotId: "",
      });
    }
  }
};

/**
 * Public: Get active ad placements safely
 */
export const getPublicAdConfig = async (req, res) => {
  try {
    await ensureDefaultAdPlacements();

    // Check global toggle
    const globalAdSetting = await Setting.findOne({ key: "ADSENSE_ENABLED" });
    const isGlobalEnabled = globalAdSetting ? !!globalAdSetting.value : false;

    const publisherSetting = await Setting.findOne({ key: "ADSENSE_PUBLISHER_ID" });
    const publisherId = publisherSetting ? String(publisherSetting.value || "").trim() : "";

    const placements = await AdPlacement.find().lean();

    return res.status(200).json({
      success: true,
      isGlobalEnabled,
      publisherId,
      placements: placements.map((p) => ({
        key: p.key,
        name: p.name,
        isEnabled: isGlobalEnabled && p.isEnabled && !!publisherId,
        slotId: p.slotId,
        format: p.format,
        responsive: p.responsive,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Get all ad placements
 */
export const getAdminAdPlacements = async (req, res) => {
  try {
    await ensureDefaultAdPlacements();
    const placements = await AdPlacement.find().sort({ createdAt: 1 }).lean();

    const globalAdSetting = await Setting.findOne({ key: "ADSENSE_ENABLED" });
    const isGlobalEnabled = globalAdSetting ? !!globalAdSetting.value : false;

    const publisherSetting = await Setting.findOne({ key: "ADSENSE_PUBLISHER_ID" });
    const publisherId = publisherSetting ? String(publisherSetting.value || "") : "";

    const adsTxtSetting = await Setting.findOne({ key: "ADS_TXT_CONTENT" });
    const adsTxt = adsTxtSetting ? String(adsTxtSetting.value || "") : "";

    return res.status(200).json({
      success: true,
      isGlobalEnabled,
      publisherId,
      adsTxt,
      placements,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Update individual ad placement
 */
export const updateAdPlacement = async (req, res) => {
  try {
    const { key } = req.params;
    const { isEnabled, slotId, format, customCode, responsive } = req.body;

    let placement = await AdPlacement.findOne({ key });
    if (!placement) {
      placement = new AdPlacement({ key, name: key });
    }

    if (isEnabled !== undefined) placement.isEnabled = !!isEnabled;
    if (slotId !== undefined) placement.slotId = String(slotId).trim();
    if (format !== undefined) placement.format = format;
    if (customCode !== undefined) placement.customCode = customCode;
    if (responsive !== undefined) placement.responsive = !!responsive;

    await placement.save();

    await AuditLog.create({
      admin: req.user._id,
      action: "AD_PLACEMENT_UPDATED",
      targetType: "AdPlacement",
      targetId: placement.key,
      details: { isEnabled: placement.isEnabled, slotId: placement.slotId },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({ success: true, placement });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Update global AdSense configuration (Publisher ID, Global Switch, ads.txt)
 */
export const updateGlobalAdConfig = async (req, res) => {
  try {
    const { isGlobalEnabled, publisherId, adsTxt } = req.body;

    if (isGlobalEnabled !== undefined) {
      await Setting.findOneAndUpdate(
        { key: "ADSENSE_ENABLED" },
        { value: !!isGlobalEnabled, type: "boolean", description: "Global Google AdSense Kill Switch", category: "features", updatedBy: req.user._id },
        { upsert: true }
      );
    }

    if (publisherId !== undefined) {
      await Setting.findOneAndUpdate(
        { key: "ADSENSE_PUBLISHER_ID" },
        { value: String(publisherId).trim(), type: "string", description: "Google AdSense Publisher ID (pub-xxxxxxxxxxxx)", category: "general", updatedBy: req.user._id },
        { upsert: true }
      );
    }

    if (adsTxt !== undefined) {
      await Setting.findOneAndUpdate(
        { key: "ADS_TXT_CONTENT" },
        { value: String(adsTxt), type: "string", description: "Google ads.txt verification file content", category: "general", updatedBy: req.user._id },
        { upsert: true }
      );
    }

    await AuditLog.create({
      admin: req.user._id,
      action: "GLOBAL_AD_CONFIG_UPDATED",
      targetType: "Setting",
      details: { isGlobalEnabled, publisherId },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({ success: true, message: "AdSense settings updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Public: ads.txt plain text endpoint
 */
export const getAdsTxt = async (req, res) => {
  try {
    const adsTxtSetting = await Setting.findOne({ key: "ADS_TXT_CONTENT" });
    const content = adsTxtSetting ? String(adsTxtSetting.value || "") : "";
    res.setHeader("Content-Type", "text/plain");
    return res.send(content || "# Google AdSense ads.txt for RAAZ\n# Configure your publisher ID in Admin CMS -> Ad Management\n");
  } catch (error) {
    return res.status(500).send("# Error reading ads.txt");
  }
};
