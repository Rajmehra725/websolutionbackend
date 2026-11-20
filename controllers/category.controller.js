import Category from "../models/category.model.js";
import Article from "../models/article.model.js";
import AuditLog from "../models/auditLog.model.js";

/**
 * 1. Public: Get all active categories
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate("parent", "name nameHindi slug")
      .sort({ order: 1, name: 1 })
      .lean();

    return res.status(200).json({ success: true, categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Public: Get category by slug
 */
export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug: slug.toLowerCase() }).populate("parent", "name nameHindi slug");

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({ success: true, category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Admin: Create Category
 */
export const createCategory = async (req, res) => {
  try {
    const {
      name,
      nameHindi = "",
      slug,
      description = "",
      descriptionHindi = "",
      parent = null,
      icon = "",
      order = 0,
      seoTitle = "",
      seoDescription = "",
      isNav = true,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "Category name and slug are required" });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9\-]/g, "-").replace(/-+/g, "-");

    const existing = await Category.findOne({ slug: cleanSlug });
    if (existing) {
      return res.status(400).json({ success: false, message: "Category slug already in use" });
    }

    const category = new Category({
      name: name.trim(),
      nameHindi: nameHindi.trim(),
      slug: cleanSlug,
      description: description.trim(),
      descriptionHindi: descriptionHindi.trim(),
      parent: parent || null,
      icon,
      order: Number(order) || 0,
      seoTitle: seoTitle.trim(),
      seoDescription: seoDescription.trim(),
      isNav: !!isNav,
    });

    await category.save();

    await AuditLog.create({
      admin: req.user._id,
      action: "CATEGORY_CREATED",
      targetType: "Category",
      targetId: category._id.toString(),
      details: { name: category.name, slug: category.slug },
      ipAddress: req.ip || "",
    });

    return res.status(201).json({ success: true, message: "Category created", category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Admin: Update Category
 */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const {
      name,
      nameHindi,
      slug,
      description,
      descriptionHindi,
      parent,
      icon,
      order,
      seoTitle,
      seoDescription,
      isNav,
    } = req.body;

    if (slug) {
      const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9\-]/g, "-").replace(/-+/g, "-");
      const existing = await Category.findOne({ _id: { $ne: category._id }, slug: cleanSlug });
      if (existing) {
        return res.status(400).json({ success: false, message: "Category slug already in use" });
      }
      category.slug = cleanSlug;
    }

    if (name !== undefined) category.name = name.trim();
    if (nameHindi !== undefined) category.nameHindi = nameHindi.trim();
    if (description !== undefined) category.description = description.trim();
    if (descriptionHindi !== undefined) category.descriptionHindi = descriptionHindi.trim();
    if (parent !== undefined) category.parent = parent || null;
    if (icon !== undefined) category.icon = icon;
    if (order !== undefined) category.order = Number(order);
    if (seoTitle !== undefined) category.seoTitle = seoTitle.trim();
    if (seoDescription !== undefined) category.seoDescription = seoDescription.trim();
    if (isNav !== undefined) category.isNav = !!isNav;

    await category.save();

    return res.status(200).json({ success: true, message: "Category updated", category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Admin: Delete Category (with safety check)
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Safety check: Don't delete if articles are assigned
    const articlesCount = await Article.countDocuments({ category: id, deletedAt: null });
    if (articlesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${articlesCount} article(s) are assigned to it. Please reassign or archive them first.`,
      });
    }

    await Category.findByIdAndDelete(id);

    await AuditLog.create({
      admin: req.user._id,
      action: "CATEGORY_DELETED",
      targetType: "Category",
      targetId: id,
      details: { name: category.name, slug: category.slug },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
