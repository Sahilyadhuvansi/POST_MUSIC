const mongoose = require("mongoose");
const { MONGO_URI } = require("./validateEnv");

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    console.log("✅ Using existing database connection");
    return;
  }

  if (!MONGO_URI) {
    throw new Error("MONGO_URI environment variable is not set");
  }

  console.log(`🔄 Attempting MongoDB connection...`);
  console.log(
    `   URI Host: ${MONGO_URI.split("@")[1]?.split("/")[0] || "unknown"}`,
  );

  try {
    const conn = await mongoose.connect(MONGO_URI, {
      retryWrites: true,
      w: "majority",
      // Force IPv4 as Vercel + Atlas can have IPv6 resolution issues
      family: 4,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    console.log(
      `✅ MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`,
    );
    return conn;
  } catch (err) {
    console.error("❌ MongoDB Connection Failed");
    console.error(`   Error Message: ${err.message}`);
    console.error(`   Error Code: ${err.code}`);
    console.error(`   Error Name: ${err.name}`);

    if (err.message.includes("ENOTFOUND")) {
      console.error("   → FIX: Check MONGO_URI host (DNS issue)");
    } else if (err.message.includes("authentication failed")) {
      console.error("   → FIX: Check MongoDB credentials in MONGO_URI");
    } else if (err.message.includes("connect ECONNREFUSED")) {
      console.error(
        "   → FIX: MongoDB cluster not accessible or IP not whitelisted",
      );
    } else if (err.message.includes("timed out")) {
      console.error(
        "   → FIX: Network timeout - check firewall/IP whitelist in MongoDB Atlas",
      );
    } else if (err.name === "MongoServerSelectionError") {
      console.error(
        "   → FIX: Cannot reach MongoDB server - check IP whitelist (try 0.0.0.0/0)",
      );
    }

    throw err;
  }
}

module.exports = connectDB;
