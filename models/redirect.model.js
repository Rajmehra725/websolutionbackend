import mongoose from "mongoose";

const redirectSchema = new mongoose.Schema(
  {
    sourceUrl: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    targetUrl: {
      type: String,
      required: true,
      trim: true,
    },
    statusCode: {
      type: Number,
      enum: [301, 302],
      default: 301,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Redirect =
  mongoose.models.Redirect || mongoose.model("Redirect", redirectSchema);

export default Redirect;
