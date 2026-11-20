import ContactMessage from "../models/contactMessage.model.js";

/**
 * Public: Submit contact message with validation
 */
export const submitContactMessage = async (req, res) => {
  try {
    const {
      name,
      email,
      subject = "",
      message,
      phone = "",
      company = "",
      inquiryType = "general",
      budget = "",
      serviceInterest = "",
    } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required fields.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const contact = new ContactMessage({
      name: name.trim(),
      email: cleanEmail,
      subject: subject.trim(),
      message: message.trim(),
      phone: phone.trim(),
      company: company.trim(),
      inquiryType: inquiryType || "general",
      budget: budget || "",
      serviceInterest: serviceInterest || "",
      ipAddress: req.ip || "",
    });

    await contact.save();

    return res.status(201).json({
      success: true,
      message: "Thank you for reaching out to RAAZ. Your message has been received.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Get contact messages
 */
export const getContactMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;
    const query = {};

    if (isRead !== undefined) {
      query.isRead = isRead === "true";
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [messages, total, unreadCount] = await Promise.all([
      ContactMessage.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ContactMessage.countDocuments(query),
      ContactMessage.countDocuments({ isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      messages,
      total,
      unreadCount,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Mark message as read/replied
 */
export const updateContactMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead, isReplied } = req.body;

    const update = {};
    if (isRead !== undefined) update.isRead = !!isRead;
    if (isReplied !== undefined) update.isReplied = !!isReplied;

    const msg = await ContactMessage.findByIdAndUpdate(id, update, { new: true });
    if (!msg) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    return res.status(200).json({ success: true, message: msg });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Admin: Delete contact message
 */
export const deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    await ContactMessage.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Message deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
