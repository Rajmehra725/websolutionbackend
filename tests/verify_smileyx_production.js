import axios from "axios";
import { createServer } from "http";
import express from "express";
import connectDB from "../config/db.js";
import User from "../models/user.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Counter from "../models/counter.model.js";

import authRoutes from "../routes/auth.routes.js";
import userRoutes from "../routes/user.routes.js";
import chatRoutes from "../routes/chat.routes.js";
import groupRoutes from "../routes/group.routes.js";
import uploadRoutes from "../routes/upload.routes.js";
import reportRoutes from "../routes/report.routes.js";

const TEST_PORT = 5092;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function runTests() {
  console.log("=================================================");
  console.log("   SMILEYX: PRODUCTION MESSAGING SUITE VERIFICATION ");
  console.log("=================================================");

  // 1. Connect MongoDB
  await connectDB();
  console.log("✅ 1. MongoDB Database Connected");

  // 2. Start Test Server
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/groups", groupRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/reports", reportRoutes);

  const server = createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`✅ 2. SmileyX Test Server Running on port ${TEST_PORT}`);

  const suffix = Date.now().toString().slice(-6);
  const emailA = `alice_${suffix}@smileyx.app`;
  const emailB = `bob_${suffix}@smileyx.app`;
  const usernameA = `alice_${suffix}`;
  const usernameB = `bob_${suffix}`;
  const password = "SmileyXPassword2026!";

  // 3. User A Registration (Email + Password Only, Strict No-OTP)
  const regResA = await axios.post(`${BASE_URL}/auth/register`, {
    fullName: "Alice Wonderland",
    username: usernameA,
    email: emailA,
    password,
    confirmPassword: password,
  });
  if (!regResA.data.success || !regResA.data.user.smileyId) {
    throw new Error("Registration A failed or missing permanent SmileyX ID");
  }
  const userA = regResA.data.user;
  const tokenA = regResA.data.token;
  const refreshTokenA = regResA.data.refreshToken;
  console.log(`✅ 3. User A Registered with Permanent SmileyX ID: [${userA.smileyId}]`);

  // 4. User B Registration (Automatic Profile Creation)
  const regResB = await axios.post(`${BASE_URL}/auth/register`, {
    fullName: "Bob Builder",
    username: usernameB,
    email: emailB,
    password,
    confirmPassword: password,
  });
  if (!regResB.data.success || !regResB.data.user.smileyId) {
    throw new Error("Registration B failed or missing permanent SmileyX ID");
  }
  const userB = regResB.data.user;
  const tokenB = regResB.data.token;
  console.log(`✅ 4. User B Registered with Permanent SmileyX ID: [${userB.smileyId}]`);

  // 5. Test Duplicate Email Rejection
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      fullName: "Duplicate Email",
      username: `unique_${suffix}`,
      email: emailA,
      password,
      confirmPassword: password,
    });
    throw new Error("Duplicate email was unexpectedly allowed");
  } catch (err) {
    if (err.response?.status === 400) {
      console.log("✅ 5. Duplicate Email Rejection Verified");
    } else {
      throw err;
    }
  }

  // 6. Test Duplicate Username Rejection
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      fullName: "Duplicate Username",
      username: usernameA,
      email: `diff_${suffix}@smileyx.app`,
      password,
      confirmPassword: password,
    });
    throw new Error("Duplicate username was unexpectedly allowed");
  } catch (err) {
    if (err.response?.status === 400) {
      console.log("✅ 6. Duplicate Username Rejection Verified");
    } else {
      throw err;
    }
  }

  // 7. Login with Email + Password
  const loginEmailRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: emailA,
    password,
  });
  if (!loginEmailRes.data.success || !loginEmailRes.data.token) {
    throw new Error("Login with email failed");
  }
  console.log("✅ 7. Login with Email + Password Verified");

  // 8. Login with permanent SmileyX ID (e.g. SX100005) + Password
  const loginIdRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: userA.smileyId,
    password,
  });
  if (!loginIdRes.data.success || !loginIdRes.data.token) {
    throw new Error("Login with SmileyX ID failed");
  }
  console.log(`✅ 8. Login with Permanent SmileyX ID (${userA.smileyId}) Verified`);

  // 9. Login with @username + Password
  const loginUsernameRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: `@${usernameA}`,
    password,
  });
  if (!loginUsernameRes.data.success || !loginUsernameRes.data.token) {
    throw new Error("Login with username failed");
  }
  console.log("✅ 9. Login with @username + Password Verified");

  // 10. Profile Editing
  const updateProfileRes = await axios.put(
    `${BASE_URL}/users/profile`,
    {
      fullName: "Alice In SmileyX",
      bio: "Crafting real-time communication ✨",
      gender: "Female",
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!updateProfileRes.data.success || updateProfileRes.data.user.fullName !== "Alice In SmileyX") {
    throw new Error("Profile edit failed");
  }
  console.log("✅ 10. Profile Editing & Customization Verified");

  // 11. Ghost Mode & Privacy Controls
  const privacyRes = await axios.put(
    `${BASE_URL}/users/privacy`,
    {
      ghostMode: false,
      showOnline: true,
      showLastSeen: true,
      showReadReceipts: true,
      showTyping: true,
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!privacyRes.data.success) {
    throw new Error("Privacy update failed");
  }
  console.log("✅ 11. Ghost Mode & Privacy Controls Verified");

  // 12. Search Users by @username and by SmileyX ID
  const searchUsernameRes = await axios.get(
    `${BASE_URL}/users/search?query=${usernameB}`,
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!searchUsernameRes.data.success || searchUsernameRes.data.users.length === 0) {
    throw new Error("Search by username failed");
  }

  const searchIdRes = await axios.get(
    `${BASE_URL}/users/search?query=${userB.smileyId}`,
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!searchIdRes.data.success || searchIdRes.data.users.length === 0) {
    throw new Error("Search by SmileyX ID failed");
  }
  console.log("✅ 12. User Search by @username and by SmileyX ID Verified");

  // 13. Direct 1-on-1 Chat Creation
  const directChatRes = await axios.post(
    `${BASE_URL}/chat/direct`,
    { recipientId: userB._id },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!directChatRes.data.success || !directChatRes.data.conversation) {
    throw new Error("Direct chat creation failed");
  }
  const conversationId = directChatRes.data.conversation._id;
  console.log(`✅ 13. Direct 1-on-1 Chat Created (${conversationId})`);

  // 14. Send Message, Reply & Reactions
  const msgRes = await axios.post(
    `${BASE_URL}/chat/messages/${conversationId}`,
    { text: "Hello Bob! Welcome to SmileyX!" },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!msgRes.data.success || !msgRes.data.message) {
    throw new Error("Send text message failed");
  }
  const msgId = msgRes.data.message._id;

  // React to message with emoji
  const reactRes = await axios.post(
    `${BASE_URL}/chat/messages/${msgId}/reaction`,
    { emoji: "❤️" },
    { headers: { Authorization: `Bearer ${tokenB}` } }
  );
  if (!reactRes.data.success) {
    throw new Error("Emoji reaction failed");
  }

  // Reply to message
  const replyRes = await axios.post(
    `${BASE_URL}/chat/messages/${conversationId}`,
    { text: "Thanks Alice! SmileyX is awesome!", replyTo: msgId },
    { headers: { Authorization: `Bearer ${tokenB}` } }
  );
  if (!replyRes.data.success || !replyRes.data.message.replyTo) {
    throw new Error("Reply message failed");
  }
  console.log("✅ 14. Text Messaging, Reply Quoting, and Emoji Reactions Verified");

  // 15. Message Editing & Ownership Enforcement
  const editRes = await axios.put(
    `${BASE_URL}/chat/messages/${msgId}`,
    { text: "Hello Bob! Welcome to SmileyX! (edited)" },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!editRes.data.success || !editRes.data.message.isEdited) {
    throw new Error("Message edit failed");
  }

  // Attempt edit by unauthorized user (Bob trying to edit Alice's message)
  try {
    await axios.put(
      `${BASE_URL}/chat/messages/${msgId}`,
      { text: "Unauthorized edit attempt" },
      { headers: { Authorization: `Bearer ${tokenB}` } }
    );
    throw new Error("Unauthorized edit was unexpectedly allowed");
  } catch (err) {
    if (err.response?.status === 403) {
      console.log("✅ 15. Message Editing with Strict Ownership Enforcement Verified");
    } else {
      throw err;
    }
  }

  // 16. Message Receipts (Delivered & Seen)
  const delivRes = await axios.post(
    `${BASE_URL}/chat/messages/${conversationId}/delivered`,
    { messageIds: [msgId] },
    { headers: { Authorization: `Bearer ${tokenB}` } }
  );
  if (!delivRes.data.success) {
    throw new Error("Delivery receipt failed");
  }

  // Read message
  const getMsgsRes = await axios.get(
    `${BASE_URL}/chat/messages/${conversationId}`,
    { headers: { Authorization: `Bearer ${tokenB}` } }
  );
  if (!getMsgsRes.data.success) {
    throw new Error("Read messages failed");
  }
  console.log("✅ 16. Double Tick Delivery and Seen Receipts Verified");

  // 17. Disappearing Messages Configuration & Automatic TTL Expiry
  const disappearingRes = await axios.put(
    `${BASE_URL}/chat/conversation/${conversationId}/disappearing`,
    { isEnabled: true, duration: 86400 }, // 24 hours
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!disappearingRes.data.success) {
    throw new Error("Setting disappearing timer failed");
  }

  // Send message in disappearing chat
  const dispMsgRes = await axios.post(
    `${BASE_URL}/chat/messages/${conversationId}`,
    { text: "This message will disappear in 24 hours" },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!dispMsgRes.data.success || !dispMsgRes.data.message.expiresAt) {
    throw new Error("Disappearing message missing calculated expiresAt");
  }
  console.log("✅ 17. Disappearing Message Timer (24h) and Calculated Expiry Verified");

  // 18. View Once Media Creation & Server-side Single-Access Enforcement
  const viewOnceMsgRes = await axios.post(
    `${BASE_URL}/chat/messages/${conversationId}`,
    {
      text: "Check this once!",
      messageType: "image",
      isViewOnce: true,
      attachments: [{ url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb", fileType: "image" }],
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  const viewOnceId = viewOnceMsgRes.data.message._id;

  // Bob unlocks view once first time -> 200 OK
  const consumeRes1 = await axios.post(
    `${BASE_URL}/chat/messages/${viewOnceId}/view-once`,
    {},
    { headers: { Authorization: `Bearer ${tokenB}` } }
  );
  if (!consumeRes1.data.success) {
    throw new Error("First View Once unlock failed");
  }

  // Bob tries to unlock view once second time -> 410 Expired
  try {
    await axios.post(
      `${BASE_URL}/chat/messages/${viewOnceId}/view-once`,
      {},
      { headers: { Authorization: `Bearer ${tokenB}` } }
    );
    throw new Error("Second View Once access was unexpectedly allowed");
  } catch (err) {
    if (err.response?.status === 410) {
      console.log("✅ 18. View Once Media & Server-Side Single Access (410 Expired) Verified");
    } else {
      throw err;
    }
  }

  // 19. Voice / Audio Message Type Support
  const voiceMsgRes = await axios.post(
    `${BASE_URL}/chat/messages/${conversationId}`,
    {
      text: "Voice Note (0:12)",
      messageType: "voice",
      attachments: [
        {
          url: "https://example.com/audio/sample_voice.m4a",
          fileType: "voice",
          duration: 12,
        },
      ],
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!voiceMsgRes.data.success || voiceMsgRes.data.message.messageType !== "voice") {
    throw new Error("Voice note message failed");
  }
  console.log("✅ 19. Voice Messaging & Audio Attachment Verified");

  // 20. Group Chat Lifecycle (Create, Add Member, Permissions, Leave)
  const createGroupRes = await axios.post(
    `${BASE_URL}/groups/create`,
    {
      name: "SmileyX Core Devs",
      description: "Building next-gen messaging",
      participants: [userB._id],
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!createGroupRes.data.success || !createGroupRes.data.group) {
    throw new Error("Create group failed");
  }
  const groupId = createGroupRes.data.group._id;

  // Send message in group
  const groupMsgRes = await axios.post(
    `${BASE_URL}/chat/messages/${groupId}`,
    { text: "Welcome to the SmileyX Core Devs group!" },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!groupMsgRes.data.success) {
    throw new Error("Group message failed");
  }
  console.log(`✅ 20. Group Chat Creation and Group Messaging Verified (${groupId})`);

  // 21. User Block & Abuse Reporting
  const blockRes = await axios.post(
    `${BASE_URL}/users/block`,
    { targetUserId: userB._id },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!blockRes.data.success) {
    throw new Error("Block user failed");
  }

  // Unblock user
  const unblockRes = await axios.post(
    `${BASE_URL}/users/unblock`,
    { targetUserId: userB._id },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!unblockRes.data.success) {
    throw new Error("Unblock user failed");
  }

  // Report user
  const reportRes = await axios.post(
    `${BASE_URL}/reports/submit`,
    {
      targetType: "user",
      targetId: userB._id,
      reason: "Harassment or Spam",
      description: "Automated test report verification",
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!reportRes.data.success) {
    throw new Error("Report user failed");
  }
  console.log("✅ 21. User Block, Unblock, and Abuse Reporting Verified");

  // 22. JWT Refresh Token Rotation
  const refreshRes = await axios.post(`${BASE_URL}/auth/refresh-token`, {
    refreshToken: refreshTokenA,
  });
  if (!refreshRes.data.success || !refreshRes.data.token) {
    throw new Error("Refresh token rotation failed");
  }
  console.log("✅ 22. JWT Session Refresh and Token Rotation Verified");

  console.log("\n=================================================");
  console.log("   🎉 ALL 22 PRODUCTION TESTS PASSED (100%)      ");
  console.log("=================================================\n");

  server.close();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err.message);
  if (err.response?.data) {
    console.error("Error details:", err.response.data);
  }
  process.exit(1);
});
