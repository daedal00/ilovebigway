const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  likelihood: {
    type: String,
    required: [true, "Likelihood is required"],
    enum: {
      values: ["mild", "medium", "hot", "bigway_hot"], // Updated scale
      message: "{VALUE} is not a supported likelihood",
    },
  },
  availability: {
    type: String, // Or perhaps Date range?
    trim: true,
    // Not strictly required based on the multi-step logic
  },
  activities: {
    type: String,
    trim: true,
  },
  contactNumber: {
    type: String,
    trim: true,
    // Validation removed
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Invite = mongoose.model("Invite", inviteSchema);

module.exports = Invite;
