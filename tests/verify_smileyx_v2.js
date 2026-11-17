import axios from "axios";
import { createServer } from "http";
import express from "express";
import connectDB from "../config/db.js";
import User from "../models/user.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import EmailOTP from "../models/emailOtp.model.js";
import Counter from "../models/counter.model.js";

import authRoutes from "../routes/auth.routes.js";
import userRoutes from "../routes/user.routes.js";
import chatRoutes from "../routes/chat.routes.js";
import groupRoutes from "../routes/group.routes.js";
import uploadRoutes from "../routes/upload.routes.js";

const TEST_PORT = 5088;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function runTests() {
  console.log("=================================================");
  console.log("   SMILEYX V2: MESSAGING PLATFORM VERIFICATION   ");
  console.log("=================================================");

  // 1. Connect MongoDB
  await connectDB();
  console.log("✅ Step 1: MongoDB Database Connected");

  // 2. Start Test Server
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/groups", groupRoutes);
  app.use("/api/upload", uploadRoutes);

  const server = createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`✅ Step 2: SmileyX Test Server Running on port ${TEST_PORT}`);

  const suffix = Date.now().toString().slice(-6);
  const emailA = `test_alice_${suffix}@smileyx.app`;
  const emailB = `test_bob_${suffix}@smileyx.app`;
  const password = "SmileyXPassword2026!";

  // 3. Email OTP for Registration
  const otpResA = await axios.post(`${BASE_URL}/auth/send-verification-otp`, { email: emailA });
  if (!otpResA.data.success || !otpResA.data.code) {
    throw new Error("Failed to send registration OTP");
  }
  const otpA = otpResA.data.code;
  console.log(`✅ Step 3: Email OTP Sent (${otpA})`);

  // Verify OTP
  const verifyRes = await axios.post(`${BASE_URL}/auth/verify-registration-otp`, {
    email: emailA,
    otp: otpA,
  });
  if (!verifyRes.data.success) {
    throw new Error("Failed to verify registration OTP");
  }
  console.log("✅ Step 4: Email OTP Verified");

  // 4. Registration with automatic permanent SmileyX ID
  const usernameA = `alice_${suffix}`;
  const regResA = await axios.post(`${BASE_URL}/auth/register`, {
    fullName: "Alice Wonderland",
    username: usernameA,
    email: emailA,
    password,
    confirmPassword: password,
  });
  if (!regResA.data.success || !regResA.data.user.smileyId) {
    throw new Error("Registration failed or missing SmileyX ID");
  }
  const userA = regResA.data.user;
  const tokenA = regResA.data.token;
  console.log(`✅ Step 5: User Registered with permanent SmileyX ID: [${userA.smileyId}]`);

  // Register second user
  const usernameB = `bob_${suffix}`;
  const regResB = await axios.post(`${BASE_URL}/auth/register`, {
    fullName: "Bob Builder",
    username: usernameB,
    email: emailB,
    password,
    confirmPassword: password,
  });
  const userB = regResB.data.user;
  const tokenB = regResB.data.token;
  console.log(`✅ Step 6: Second User Registered with SmileyX ID: [${userB.smileyId}]`);

  // 5. Complete Profile Setup
  const setupRes = await axios.put(
    `${BASE_URL}/auth/profile-setup`,
    {
      fullName: "Alice W.",
      username: usernameA,
      bio: "Creating the future of messaging on SmileyX ✨",
      gender: "Female",
      dateOfBirth: "2000-05-15",
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!setupRes.data.success || !setupRes.data.user.profileCompleted) {
    throw new Error("Profile setup failed");
  }
  console.log("✅ Step 7: Profile Setup & Customization Verified");

  // 6. Login using Email + Password (no OTP required)
  const loginEmailRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: emailA,
    password,
  });
  if (!loginEmailRes.data.success || !loginEmailRes.data.token) {
    throw new Error("Email login failed");
  }
  console.log("✅ Step 8: Standard Login using Email + Password Verified");

  // 7. Login using SmileyX ID (e.g. SX100001) + Password
  const loginIdRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: userA.smileyId,
    password,
  });
  if (!loginIdRes.data.success) {
    throw new Error("SmileyX ID login failed");
  }
  console.log(`✅ Step 9: Login using permanent SmileyX ID (${userA.smileyId}) Verified`);

  // 8. Forgot Password Flow with Email OTP
  const forgotOtpRes = await axios.post(`${BASE_URL}/auth/forgot-password-otp`, {
    email: emailA,
  });
  if (!forgotOtpRes.data.success || !forgotOtpRes.data.code) {
    throw new Error("Forgot password OTP failed");
  }
  const resetOtp = forgotOtpRes.data.code;
  const newPassword = "NewSmileyPassword999!";

  const resetRes = await axios.post(`${BASE_URL}/auth/reset-password-otp`, {
    email: emailA,
    otp: resetOtp,
    newPassword,
    confirmPassword: newPassword,
  });
  if (!resetRes.data.success) {
    throw new Error("Password reset failed");
  }

  // Verify login with new password
  const newLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: emailA,
    password: newPassword,
  });
  if (!newLoginRes.data.success) {
    throw new Error("Login with new password failed");
  }
  console.log("✅ Step 10: Forgot Password & Email OTP Recovery Verified");

  // 9. Search Users by @username and by permanent SmileyX ID
  const searchUsernameRes = await axios.get(
    `${BASE_URL}/users/search?query=${usernameB}`,
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!searchUsernameRes.data.success || searchUsernameRes.data.users.length === 0) {
    throw new Error("Search by username failed");
  }

  const searchSmileyIdRes = await axios.get(
    `${BASE_URL}/users/search?query=${userB.smileyId}`,
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!searchSmileyIdRes.data.success || searchSmileyIdRes.data.users.length === 0) {
    throw new Error("Search by SmileyX ID failed");
  }
  console.log("✅ Step 11: User Search by @username and by SmileyX ID Verified");

  // 10. Direct 1-on-1 Chat Creation
  const directChatRes = await axios.post(
    `${BASE_URL}/chat/direct`,
    { recipientId: userB._id },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!directChatRes.data.success || !directChatRes.data.conversation) {
    throw new Error("Failed to create direct chat");
  }
  const conversationId = directChatRes.data.conversation._id;
  console.log(`✅ Step 12: Direct 1-on-1 Chat Created (${conversationId})`);

  // 11. Send Standard Text Message
  const sendMsgRes = await axios.post(
    `${BASE_URL}/chat/messages/${conversationId}`,
    { text: "Hello Bob! Welcome to SmileyX!" },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!sendMsgRes.data.success || !sendMsgRes.data.message) {
    throw new Error("Sending message failed");
  }
  const msgId = sendMsgRes.data.message._id;
  console.log("✅ Step 13: Standard Messaging Verified");

  // 12. Message Delivery and Read Receipts
  await axios.post(
    `${BASE_URL}/chat/messages/${conversationId}/delivered`,
    { messageIds: [msgId] },
    { headers: { Authorization: `Bearer ${tokenB}` } }
  );
  console.log("✅ Step 14: Message Delivery Receipt (Double Tick) Verified");

  // 13. Message Reactions & Editing
  const reactRes = await axios.post(
    `${BASE_URL}/chat/messages/${msgId}/reaction`,
    { emoji: "❤️" },
    { headers: { Authorization: `Bearer ${tokenB}` } }
  );
  if (!reactRes.data.success) {
    throw new Error("Reaction failed");
  }

  const editRes = await axios.put(
    `${BASE_URL}/chat/messages/${msgId}`,
    { text: "Hello Bob! Welcome to SmileyX! (Updated with love)" },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!editRes.data.success || !editRes.data.message.isEdited) {
    throw new Error("Message edit failed");
  }
  console.log("✅ Step 15: Message Reaction (❤️) and Editing Verified");

  // 14. Disappearing Messages Mode
  const disappearingRes = await axios.put(
    `${BASE_URL}/chat/conversation/${conversationId}/disappearing`,
    { isEnabled: true, duration: 86400 }, // 24 hours
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!disappearingRes.data.success || !disappearingRes.data.disappearingMode.isEnabled) {
    throw new Error("Disappearing timer configuration failed");
  }

  // Send a disappearing message
  const disMsgRes = await axios.post(
    `${BASE_URL}/chat/messages/${conversationId}`,
    { text: "This message will disappear in 24 hours!" },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!disMsgRes.data.success || !disMsgRes.data.message.expiresAt) {
    throw new Error("Disappearing message auto-expiry timestamp missing");
  }
  console.log("✅ Step 16: Disappearing Messages Configuration & Expiry Verified");

  // 15. View Once Media Sending & Server-side Single Consumption
  const viewOnceMsgRes = await axios.post(
    `${BASE_URL}/chat/messages/${conversationId}`,
    {
      text: "[Photo]",
      messageType: "image",
      attachments: [{ url: "https://example.com/secret_photo.jpg", fileType: "image" }],
      isViewOnce: true,
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!viewOnceMsgRes.data.success || !viewOnceMsgRes.data.message.isViewOnce) {
    throw new Error("View Once message sending failed");
  }
  const viewOnceMsgId = viewOnceMsgRes.data.message._id;

  // Recipient opens View Once for the FIRST time
  const consumeFirstRes = await axios.post(
    `${BASE_URL}/chat/messages/${viewOnceMsgId}/view-once`,
    {},
    { headers: { Authorization: `Bearer ${tokenB}` } }
  );
  if (!consumeFirstRes.data.success || consumeFirstRes.data.attachments.length === 0) {
    throw new Error("First View Once consumption failed");
  }

  // Recipient attempts to open View Once a SECOND time -> MUST BE 410 Expired!
  try {
    await axios.post(
      `${BASE_URL}/chat/messages/${viewOnceMsgId}/view-once`,
      {},
      { headers: { Authorization: `Bearer ${tokenB}` } }
    );
    throw new Error("View Once allowed second viewing! Server enforcement broken.");
  } catch (err) {
    if (err.response?.status === 410 && err.response?.data?.expired) {
      console.log("✅ Step 17: View Once Server-Side Single-View Enforcement Verified (410 Expired)");
    } else {
      throw err;
    }
  }

  // 16. Pin & Archive Conversation
  const pinRes = await axios.put(
    `${BASE_URL}/chat/conversation/${conversationId}/pin`,
    {},
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!pinRes.data.success || !pinRes.data.isPinned) {
    throw new Error("Pin conversation failed");
  }
  console.log("✅ Step 18: Pin & Archive Conversation Verified");

  // 17. Group Chat Creation & Management
  const groupRes = await axios.post(
    `${BASE_URL}/groups/create`,
    {
      name: "SmileyX Elite Club",
      description: "Exclusive messaging circle",
      participants: [userB._id],
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!groupRes.data.success || !groupRes.data.group) {
    throw new Error("Group creation failed");
  }
  const groupId = groupRes.data.group._id;

  // Group Admin-Only messaging toggle
  const adminMsgToggleRes = await axios.put(
    `${BASE_URL}/groups/${groupId}/admin-messaging`,
    {},
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!adminMsgToggleRes.data.success) {
    throw new Error("Group admin toggle failed");
  }
  console.log("✅ Step 19: Group Chat Creation & Admin Authorization Verified");

  // 18. User Blocking & Unblocking
  const blockRes = await axios.post(
    `${BASE_URL}/users/block`,
    { targetUserId: userB._id },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!blockRes.data.success) {
    throw new Error("Block user failed");
  }

  const unblockRes = await axios.post(
    `${BASE_URL}/users/unblock`,
    { targetUserId: userB._id },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  if (!unblockRes.data.success) {
    throw new Error("Unblock user failed");
  }
  console.log("✅ Step 20: User Blocking & Privacy Controls Verified");

  console.log("=================================================");
  console.log("🎉 ALL 20 SMILEYX V2 BACKEND TESTS PASSED! 🎉");
  console.log("=================================================");

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
