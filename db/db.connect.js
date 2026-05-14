const mongoose = require("mongoose");
require("dotenv").config();

const initializeDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("DB connection successful.");
  } catch (error) {
    console.error("Error in connecting DB : ", error);
    //API may run without database access.
    process.exit(1);
  }
};

module.exports = { initializeDatabase };
