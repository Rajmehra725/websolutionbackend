import mongoose from "mongoose";
import dns from "dns";

// Force Google DNS for reliable SRV record resolution
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  const uri =
    process.env.MONGODB_URI ||
    "mongodb+srv://smileyx_admin:SmileyXraazzz%40123@smileyx-cluster.junsert.mongodb.net/?appName=Cluster0";

  let conn = null;
  try {
    console.log("Connecting to primary MongoDB URI...");
    conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log("✅ Primary MongoDB Connected. Host:", conn.connection.host);
  } catch (primaryErr) {
    console.warn("⚠️ Primary MongoDB connection failed (likely Atlas IP whitelist or network). Trying local fallback...");
    try {
      conn = await mongoose.connect("mongodb://127.0.0.1:27017/smileyx", {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      console.log("✅ Local MongoDB Connected. Host:", conn.connection.host);
    } catch (localErr) {
      console.error("❌ Both Primary and Local MongoDB connections failed:", localErr);
      process.exit(1);
    }
  }

  try {
    // Drop legacy stale indexes if present to prevent conflict
    const userCollection = mongoose.connection.collection("users");
    const indexes = await userCollection.indexes();
    const hasStaleIndex = indexes.some((idx) => idx.name === "mobileNumber_1");
    if (hasStaleIndex) {
      await userCollection.dropIndex("mobileNumber_1");
      console.log("🧹 Dropped legacy mobileNumber_1 index from users collection");
    }
  } catch (indexErr) {
    // Non-fatal if index cannot be dropped or doesn't exist
  }

  return conn;
};

export default connectDB;