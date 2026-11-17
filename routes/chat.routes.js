import express from "express";
import {
  getOrCreateDirectChat,
  getConversations,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  togglePinMessage,
  toggleStarMessage,
  getConversationDetails,
  clearChat,
  forwardMessage,
  markDelivered,
  consumeViewOnceMessage,
  updateDisappearingTimer,
  togglePinConversation,
  toggleArchiveConversation,
  toggleMuteConversation,
} from "../controllers/chat.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/conversations", protect, getConversations);
router.get("/conversation/:conversationId", protect, getConversationDetails);
router.put("/conversation/:conversationId/disappearing", protect, updateDisappearingTimer);
router.put("/conversation/:conversationId/pin", protect, togglePinConversation);
router.put("/conversation/:conversationId/archive", protect, toggleArchiveConversation);
router.put("/conversation/:conversationId/mute", protect, toggleMuteConversation);

router.post("/direct", protect, getOrCreateDirectChat);
router.get("/messages/:conversationId", protect, getMessages);
router.post("/messages/:conversationId", protect, sendMessage);
router.put("/messages/:messageId", protect, editMessage);
router.delete("/messages/:messageId", protect, deleteMessage);
router.post("/messages/:messageId/view-once", protect, consumeViewOnceMessage);
router.post("/messages/:messageId/reaction", protect, reactToMessage);
router.put("/messages/:messageId/pin", protect, togglePinMessage);
router.put("/messages/:messageId/star", protect, toggleStarMessage);
router.post("/messages/:conversationId/clear", protect, clearChat);
router.post("/messages/:messageId/forward", protect, forwardMessage);
router.post("/messages/:conversationId/delivered", protect, markDelivered);

export default router;
