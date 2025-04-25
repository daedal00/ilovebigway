require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const Invite = require("./models/Invite");

const app = express();
const PORT = process.env.PORT || 3000; // Use port from .env or default to 3000
const mongoURI = process.env.MONGODB_URI;
const frontendURL = process.env.FRONTEND_URL || "*"; // Allow all origins if not specified

// --- Database Connection ---
if (!mongoURI) {
  console.error("FATAL ERROR: MONGODB_URI is not defined.");
  process.exit(1); // Exit if MongoDB URI is missing
}

mongoose
  .connect(mongoURI)
  .then(() => console.log("MongoDB connected successfully."))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit on connection failure
  });

// --- Middleware ---
// Enable CORS - restrict in production!
app.use(
  cors({
    origin: frontendURL, // Allow requests from your Vercel frontend URL
  })
);
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from public/

// --- Basic Routes (Placeholders for now) ---
app.get("/", (req, res) => {
  // This will be handled by the static middleware, serving index.html
  // We can keep this as a fallback or remove it.
  res.send("Server is running. Static files should be served from /public.");
});

// API routes will be added later
// --- API Routes ---

// POST /submit - Handle form submission
app.post("/submit", async (req, res) => {
  try {
    // We don't need the password from the body anymore
    const { name, likelihood, availability, activities, contactNumber } =
      req.body;

    // Create a new Invite document
    const newInvite = new Invite({
      name,
      likelihood,
      availability,
      activities,
      contactNumber,
    });

    // Save to database
    await newInvite.save();

    // Respond to the client
    res.status(201).json({
      message:
        "Submission successful! Please DM [Your Name/Contact Info] to let us know.",
      invite: newInvite,
    });
  } catch (error) {
    console.error("Submission error:", error);
    // Mongoose validation errors can be handled more gracefully
    if (error.name === "ValidationError") {
      // Extract meaningful error messages
      const messages = Object.values(error.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ message: "Validation failed", errors: messages });
    }
    res.status(500).send("Error saving submission");
  }
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Accepting requests from: ${frontendURL}`);
});
