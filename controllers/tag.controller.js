import Tag from "../models/tag.model.js";

export const getTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ articleCount: -1, name: 1 }).lean();
    return res.status(200).json({ success: true, tags });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createTag = async (req, res) => {
  try {
    const { name, nameHindi = "", slug } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "Tag name and slug are required" });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9\-]/g, "-").replace(/-+/g, "-");
    const existing = await Tag.findOne({ slug: cleanSlug });
    if (existing) {
      return res.status(400).json({ success: false, message: "Tag slug already exists" });
    }

    const tag = new Tag({
      name: name.trim(),
      nameHindi: nameHindi.trim(),
      slug: cleanSlug,
    });
    await tag.save();

    return res.status(201).json({ success: true, tag });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    await Tag.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Tag deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
