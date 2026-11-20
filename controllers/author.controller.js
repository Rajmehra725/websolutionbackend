import Author from "../models/author.model.js";
import Article from "../models/article.model.js";

export const getAuthors = async (req, res) => {
  try {
    const authors = await Author.find().sort({ articleCount: -1, name: 1 }).lean();
    return res.status(200).json({ success: true, authors });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAuthorBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const author = await Author.findOne({ slug: slug.toLowerCase() });

    if (!author) {
      return res.status(404).json({ success: false, message: "Author not found" });
    }

    const articles = await Article.find({
      author: author._id,
      status: "published",
      deletedAt: null,
    })
      .populate("category", "name nameHindi slug")
      .select("title slug excerpt coverImage readingTimeMinutes publishedAt locale")
      .sort({ publishedAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({ success: true, author, articles });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createAuthor = async (req, res) => {
  try {
    const {
      name,
      nameHindi = "",
      slug,
      bio = "",
      bioHindi = "",
      profileImage = "",
      email = "",
      socialLinks = {},
      user = null,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "Author name and slug are required" });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9\-]/g, "-").replace(/-+/g, "-");
    const existing = await Author.findOne({ slug: cleanSlug });
    if (existing) {
      return res.status(400).json({ success: false, message: "Author slug already exists" });
    }

    const author = new Author({
      name: name.trim(),
      nameHindi: nameHindi.trim(),
      slug: cleanSlug,
      bio: bio.trim(),
      bioHindi: bioHindi.trim(),
      profileImage,
      email: email.trim().toLowerCase(),
      socialLinks,
      user: user || null,
    });

    await author.save();
    return res.status(201).json({ success: true, author });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const author = await Author.findById(id);

    if (!author) {
      return res.status(404).json({ success: false, message: "Author not found" });
    }

    const { name, nameHindi, bio, bioHindi, profileImage, email, socialLinks } = req.body;

    if (name !== undefined) author.name = name.trim();
    if (nameHindi !== undefined) author.nameHindi = nameHindi.trim();
    if (bio !== undefined) author.bio = bio.trim();
    if (bioHindi !== undefined) author.bioHindi = bioHindi.trim();
    if (profileImage !== undefined) author.profileImage = profileImage;
    if (email !== undefined) author.email = email.trim().toLowerCase();
    if (socialLinks !== undefined) author.socialLinks = socialLinks;

    await author.save();
    return res.status(200).json({ success: true, author });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    await Author.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Author deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
