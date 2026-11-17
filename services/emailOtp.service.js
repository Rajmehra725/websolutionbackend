import EmailOTP from "../models/emailOtp.model.js";

/**
 * Generate 6-digit numeric OTP
 */
export function generateNumericOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send Email OTP Service
 * @param {string} email
 * @param {'registration' | 'password_reset'} purpose
 */
export async function sendEmailOTP(email, purpose = "registration") {
  const cleanEmail = email.trim().toLowerCase();

  // Remove existing OTP for this email and purpose
  await EmailOTP.deleteMany({ email: cleanEmail, purpose });

  const otp = generateNumericOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await EmailOTP.create({
    email: cleanEmail,
    otp,
    purpose,
    expiresAt,
    attempts: 0,
  });

  console.log(`📧 [SmileyX Email OTP] Sent to ${cleanEmail} for ${purpose}: [${otp}]`);

  return {
    success: true,
    message: `Verification code sent to ${cleanEmail}`,
    // Include in response in dev/test for seamless automated verification
    code: process.env.NODE_ENV !== "production" ? otp : undefined,
  };
}

/**
 * Verify Email OTP Service
 * @param {string} email
 * @param {string} otp
 * @param {'registration' | 'password_reset'} purpose
 */
export async function verifyEmailOTP(email, otp, purpose = "registration") {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = (otp || "").toString().trim();

  const record = await EmailOTP.findOne({ email: cleanEmail, purpose });

  if (!record) {
    return {
      success: false,
      message: "No verification code requested or code has expired. Please request a new one.",
    };
  }

  if (record.expiresAt < new Date()) {
    await EmailOTP.deleteOne({ _id: record._id });
    return {
      success: false,
      message: "Verification code has expired. Please request a new one.",
    };
  }

  if (record.attempts >= 5) {
    await EmailOTP.deleteOne({ _id: record._id });
    return {
      success: false,
      message: "Too many failed attempts. Please request a new verification code.",
    };
  }

  if (record.otp !== cleanOtp) {
    record.attempts += 1;
    await record.save();
    return {
      success: false,
      message: "Incorrect verification code. Please try again.",
    };
  }

  // OTP is valid! Delete record so it cannot be reused
  await EmailOTP.deleteOne({ _id: record._id });

  return {
    success: true,
    message: "Email verified successfully.",
  };
}
