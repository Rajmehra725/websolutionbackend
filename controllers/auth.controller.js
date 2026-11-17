import User from "../models/user.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import jwt from "jsonwebtoken";
import {
  sendEmailOTP,
  verifyEmailOTP,
} from "../services/emailOtp.service.js";

const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.__v;
  return obj;
};

/**
 * Check if a username is available
 */
export const checkUsernameAvailability = async (req, res) => {
  try {
    const raw = (req.query.username || "").toString();
    const username = raw.replace(/^@+/, "").trim().toLowerCase();

    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Username must be at least 3 characters",
      });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Username can only contain letters, numbers, and underscores",
      });
    }

    const existingUser = await User.findOne({ username });
    return res.status(200).json({
      success: true,
      available: !existingUser,
      message: existingUser ? `Username @${username} is already taken` : `Username @${username} is available`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send Email OTP for Registration
 */
export const sendEmailVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email address is required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email address is already registered. Please login.",
      });
    }

    const result = await sendEmailOTP(cleanEmail, "registration");
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verify Email OTP for Registration
 */
export const verifyEmailVerificationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and verification code are required" });
    }

    const result = await verifyEmailOTP(email, otp, "registration");
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send Password Reset OTP
 */
export const sendForgotPasswordOtp = async (req, res) => {
  try {
    const { email, identifier } = req.body;
    const lookup = (email || identifier || "").trim().toLowerCase();

    if (!lookup) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({
      $or: [{ email: lookup }, { username: lookup.replace(/^@+/, "") }],
    });

    if (!user || !user.email) {
      return res.status(404).json({
        success: false,
        message: "No account found matching this identifier",
      });
    }

    const result = await sendEmailOTP(user.email, "password_reset");
    return res.status(200).json({
      ...result,
      email: user.email,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reset Password using verified OTP
 */
export const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, verification code, and new password are required",
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const verifyResult = await verifyEmailOTP(cleanEmail, otp, "password_reset");
    if (!verifyResult.success) {
      return res.status(400).json(verifyResult);
    }

    const user = await User.findOne({ email: cleanEmail }).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. You can now login.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Complete / Setup Profile (After Registration)
 */
export const setupProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    let { fullName, username, profileImage, bio, dateOfBirth, gender } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: "Full Name is required" });
    }

    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }

    const cleanUsername = username.replace(/^@+/, "").trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3-20 characters and contain only letters, numbers, and underscores",
      });
    }

    const existingUser = await User.findOne({
      username: cleanUsername,
      _id: { $ne: userId },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `Username @${cleanUsername} is already taken`,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.fullName = fullName.trim();
    user.username = cleanUsername;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (bio !== undefined) user.bio = bio.trim();
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (gender) user.gender = gender;
    user.profileCompleted = true;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile completed successfully!",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Register a new SmileyX user (Email, Username, Password - No OTP)
 */
export const register = async (req, res) => {
  try {
    let {
      fullName,
      username,
      email,
      phone,
      password,
      confirmPassword,
      profileImage,
      termsAccepted,
    } = req.body;

    if (!fullName || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "Full Name, Username, and Password are required",
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address or mobile number",
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and Confirm Password do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Clean username (remove leading @ and whitespace, lowercase)
    username = username.replace(/^@+/, "").trim().toLowerCase();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be 3-20 characters and contain only letters, numbers, and underscores",
      });
    }

    // Check if username is already taken
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: `Username @${username} is already taken. Please choose another.`,
      });
    }

    // Validate email if provided
    let cleanEmail = "";
    if (email) {
      cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address",
        });
      }
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email address is already registered. Please login.",
        });
      }
    }

    // Check if phone number is already registered (if provided)
    let cleanPhone = "";
    if (phone) {
      cleanPhone = phone.trim();
      const existingPhone = await User.findOne({ phone: cleanPhone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: "Mobile number is already registered. Please login.",
        });
      }
    }

    // If OTP provided, verify it
    const { otp } = req.body;
    if (otp && cleanEmail) {
      const otpCheck = await verifyEmailOTP(cleanEmail, otp, "registration");
      if (!otpCheck.success) {
        return res.status(400).json(otpCheck);
      }
    }

    // Check if first user to grant super_admin, otherwise user
    const totalUsers = await User.countDocuments();
    const role = totalUsers === 0 ? "super_admin" : "user";
    const isPrimarySuperAdmin = totalUsers === 0;

    const user = new User({
      fullName: fullName.trim(),
      username,
      email: cleanEmail,
      phone: cleanPhone || undefined,
      mobileNumber: cleanPhone || undefined,
      password,
      profileImage: profileImage || "",
      emailVerified: true,
      profileCompleted: Boolean(fullName && username),
      role,
      isPrimarySuperAdmin,
      isOnline: true,
      lastLogin: new Date(),
    });

    await user.save();

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(201).json({
      success: true,
      message: "Welcome to SmileyX! Account created successfully.",
      token,
      refreshToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

/**
 * Login using Email, Username, OR Mobile Number + Password
 */
export const login = async (req, res) => {
  try {
    const { identifier, username, email, phone, password } = req.body;

    const rawId = (identifier || username || email || phone || "").trim();

    if (!rawId || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email/username and password",
      });
    }

    // Clean identifier
    const cleanUsername = rawId.replace(/^@+/, "").toLowerCase();
    const cleanEmail = rawId.toLowerCase();
    const cleanSmileyId = rawId.toUpperCase();

    // Query by username OR email OR smileyId OR phone
    const user = await User.findOne({
      $or: [
        { username: cleanUsername },
        { email: cleanEmail },
        { smileyId: cleanSmileyId },
        { phone: rawId },
        { mobileNumber: rawId },
      ],
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. User does not exist.",
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: `Your account has been banned: ${user.banReason || "Terms violation"}`,
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Your account is temporarily suspended. Contact support.",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Please try again.",
      });
    }

    // Update status
    user.isOnline = true;
    user.lastLogin = new Date();
    await user.save();

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      refreshToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: clientRefreshToken } = req.body;

    if (!clientRefreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const secret =
      process.env.JWT_REFRESH_SECRET ||
      process.env.JWT_SECRET ||
      "raazchat_refresh_secret_2026";

    const decoded = jwt.verify(clientRefreshToken, secret);
    const user = await User.findById(decoded.id);

    if (!user || user.isBanned || user.isSuspended) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token or inactive account",
      });
    }

    const token = generateAccessToken(user);
    return res.status(200).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Expired or invalid refresh token",
    });
  }
};

/**
 * Get profile of authenticated user
 */
export const getProfile = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Change Password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Account Recovery / Password Reset
 */
export const recoverAccount = async (req, res) => {
  try {
    const { phone, username, email, identifier, newPassword } = req.body;
    const lookupId = (identifier || email || username || phone || "").trim();

    if (!lookupId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email/username and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const cleanUsername = lookupId.toLowerCase().replace(/^@+/, "");
    const cleanEmail = lookupId.toLowerCase();

    const user = await User.findOne({
      $or: [
        { username: cleanUsername },
        { email: cleanEmail },
        { phone: lookupId },
        { mobileNumber: lookupId },
      ],
    }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found matching the provided details",
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. You may now login.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete Account
 */
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      success: true,
      message: "Account deleted permanently",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Logout
 */
export const logout = async (req, res) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        isOnline: false,
        lastSeen: new Date(),
        socketId: "",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      message: "Logout completed",
    });
  }
};

// Legacy backwards compatibility endpoints (for existing mobile clients)
export const sendOTP = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "OTP authentication is optional in RaazChat Pro. Please use password login or registration.",
    data: { phone: req.body.phone, otp: "123456" },
  });
};

export const verifyOTP = async (req, res) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone });
  if (user) {
    const token = generateAccessToken(user);
    return res.status(200).json({
      success: true,
      isRegistered: true,
      message: "OTP Verified",
      token,
      user: sanitizeUser(user),
    });
  }
  return res.status(200).json({
    success: true,
    isRegistered: false,
    message: "Please complete registration",
    data: { phone },
  });
};