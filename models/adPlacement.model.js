import mongoose from "mongoose";

const adPlacementSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    slotId: {
      type: String,
      default: "",
      trim: true,
    },
    format: {
      type: String,
      enum: ["auto", "horizontal", "rectangle", "vertical"],
      default: "auto",
    },
    customCode: {
      type: String,
      default: "",
    },
    responsive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const AdPlacement =
  mongoose.models.AdPlacement ||
  mongoose.model("AdPlacement", adPlacementSchema);

export default AdPlacement;
