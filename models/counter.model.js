import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 100000 },
});

const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

/**
 * Get next permanent SmileyX ID (e.g. SX100001)
 */
export async function getNextSmileyId() {
  const counter = await Counter.findByIdAndUpdate(
    { _id: "smiley_id" },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );
  const number = counter.seq < 100000 ? counter.seq + 100000 : counter.seq;
  return `SX${number}`;
}

export default Counter;
