import cron from "node-cron";
import TimeCapsule from "../models/timeCapsule.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Article from "../models/article.model.js";
import { io } from "../index.js";

/**
 * Background Scheduler to deliver pending Time Capsules
 * Runs every minute to check if any capsules reached their deliverAt timestamp
 */
export const startCapsuleScheduler = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const dueCapsules = await TimeCapsule.find({
        status: "pending",
        deliverAt: { $lte: now },
      }).populate("sender", "fullName username profileImage");

      for (const capsule of dueCapsules) {
        try {
          // Find or create conversation between sender and recipient
          let conversation = await Conversation.findOne({
            type: "direct",
            participants: { $all: [capsule.sender._id, capsule.recipient] },
          });

          if (!conversation) {
            conversation = new Conversation({
              type: "direct",
              participants: [capsule.sender._id, capsule.recipient],
              admins: [capsule.sender._id, capsule.recipient],
            });
            await conversation.save();
          }

          // Create delivered message
          const message = new Message({
            conversation: conversation._id,
            sender: capsule.sender._id,
            senderName: capsule.sender.fullName,
            senderAvatar: capsule.sender.profileImage,
            text: `⏳ [Time Capsule Opened] ${capsule.title}: ${capsule.message}`,
            messageType: "capsule",
            attachments: capsule.mediaUrl ? [{ url: capsule.mediaUrl, fileType: "image" }] : [],
            status: "sent",
          });
          await message.save();

          conversation.lastMessage = message._id;
          conversation.lastMessageText = message.text;
          conversation.lastMessageAt = new Date();
          await conversation.save();

          capsule.status = "delivered";
          capsule.deliveredAt = new Date();
          await capsule.save();

          // Broadcast through socket if online
          if (io) {
            io.to(conversation._id.toString()).emit("newMessage", message);
            io.to(capsule.recipient.toString()).emit("capsuleDelivered", {
              capsuleId: capsule._id,
              title: capsule.title,
              senderName: capsule.sender.fullName,
            });
          }
          console.log(`[Scheduler] ⏳ Time Capsule delivered: "${capsule.title}"`);
        } catch (deliveryError) {
          console.error(`[Scheduler] Failed delivering capsule ${capsule._id}:`, deliveryError);
          capsule.deliveryAttempts = (capsule.deliveryAttempts || 0) + 1;
          if (capsule.deliveryAttempts >= 3) {
            capsule.status = "failed";
          }
          await capsule.save();
        }
      }

      // Publish scheduled articles whose scheduledAt has arrived
      const scheduledArticles = await Article.find({
        status: "scheduled",
        scheduledAt: { $ne: null, $lte: now },
        deletedAt: null,
      });

      if (scheduledArticles.length > 0) {
        for (const art of scheduledArticles) {
          art.status = "published";
          art.publishedAt = now;
          await art.save();
          console.log(`[Scheduler] 📰 Auto-published scheduled article: "${art.title}" (${art.slug})`);
        }
      }

      // Cleanup expired disappearing messages
      const expiredMessages = await Message.find({
        expiresAt: { $ne: null, $lte: now },
      });

      if (expiredMessages.length > 0) {
        for (const expMsg of expiredMessages) {
          if (io) {
            io.to(expMsg.conversation.toString()).emit("messageDeleted", {
              messageId: expMsg._id,
              conversationId: expMsg.conversation,
              reason: "expired",
            });
          }
        }
        const deletedResult = await Message.deleteMany({
          expiresAt: { $ne: null, $lte: now },
        });
        console.log(`[Scheduler] 🧹 Cleaned up ${deletedResult.deletedCount} expired disappearing messages`);
      }
    } catch (err) {
      console.error("[Scheduler] Error in persistent scheduler:", err);
    }
  });

  console.log("⏰ SmileyX Persistent Scheduler & Disappearing Cleaner initialized");
};
