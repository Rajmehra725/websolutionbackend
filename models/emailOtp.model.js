import mongoose from "mongoose";

const emailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["registration", "password_reset"],
      default: "registration",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: auto delete when expiresAt is reached
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

emailOtpSchema.index({ email: 1, purpose: 1 });

const EmailOTP = mongoose.models.EmailOTP || mongoose.model("EmailOTP", emailOtpSchema);

export default EmailOTP;
