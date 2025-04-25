require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cors = require("cors");
const path = require("path");
const Invite = require("./models/Invite");

const app = express();
const PORT = process.env.PORT || 3000; // Use port from .env or default to 3000
const mongoURI = process.env.MONGODB_URI;
const frontendURL = process.env.FRONTEND_URL || "*"; // Allow all origins if not specified

// --- Remove Mailtrap Nodemailer Setup ---
// No transporter setup needed here initially

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

// POST /api/verify-password - Check submitted password against env variable
app.post("/api/verify-password", (req, res) => {
  console.log("Received POST request on /api/verify-password");
  const { password } = req.body;
  const correctPassword = process.env.SITE_PASSWORD;

  if (!correctPassword) {
    console.error(
      "FATAL ERROR: SITE_PASSWORD environment variable is not set."
    );
    // Don't reveal specifics to the client, but log it
    return res.status(500).json({ message: "Server configuration error." });
  }

  if (!password) {
    return res.status(400).json({ message: "Password is required." });
  }

  if (password === correctPassword) {
    console.log("Password verification successful.");
    res.status(200).json({ message: "Password verified successfully." });
  } else {
    console.log("Password verification failed.");
    res.status(401).json({ message: "Incorrect password." });
  }
});

// POST /submit - Handle form submission
app.post("/submit", async (req, res) => {
  console.log("Received POST request on /submit");
  try {
    const { name, likelihood, availability, activities, contactNumber } =
      req.body;

    const newInvite = new Invite({
      name,
      likelihood,
      availability,
      activities,
      contactNumber,
    });

    // Save to database
    await newInvite.save();

    // --- Send Email Notification (Always) ---
    console.log("Attempting to send email...");

    // Configure transporter using explicit host/port
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // Gmail SMTP host
      port: 587, // Port for TLS/STARTTLS
      secure: false, // false for STARTTLS; true for SSL (port 465)
      auth: {
        user: process.env.GMAIL_USER, // Your Gmail address from .env
        pass: process.env.GMAIL_APP_PASSWORD, // Your Gmail App Password from .env
      },
    });

    // Verify transporter configuration (optional but good practice)
    transporter.verify((error, success) => {
      if (error) {
        console.error("Gmail transporter configuration error:", error);
      } else {
        console.log("Gmail transporter is ready to send emails.");
      }
    });

    const mailOptions = {
      from: `"Bigway Form Response" <${process.env.GMAIL_USER}>`, // Sender address
      to: process.env.EMAIL_TO, // Receiver address from .env
      subject: "New Bigway Form Submission", // Subject line
      text: `New form submission received:\n\nName: ${
        newInvite.name
      }\nLikelihood: ${newInvite.likelihood}\nAvailability: ${
        newInvite.availability || "N/A"
      }\nActivities: ${newInvite.activities || "N/A"}\nContact Number: ${
        newInvite.contactNumber || "N/A"
      }`, // Plain text body
      html: `<h2>New Bigway RSVP Submission</h2>
             <p><strong>Name:</strong> ${newInvite.name}</p>
             <p><strong>Likelihood:</strong> ${newInvite.likelihood}</p>
             <p><strong>Availability:</strong> ${
               newInvite.availability || "N/A"
             }</p>
             <p><strong>Activities:</strong> ${
               newInvite.activities || "N/A"
             }</p>
             <p><strong>Contact Number:</strong> ${
               newInvite.contactNumber || "N/A"
             }</p>`, // HTML body
    };

    // Send the email using the callback pattern
    console.log("Attempting to send email via Gmail with options:", {
      to: mailOptions.to,
      from: mailOptions.from,
      subject: mailOptions.subject,
    });
    transporter.sendMail(mailOptions, function (emailError, info) {
      if (emailError) {
        console.error("Error sending Gmail notification email:", emailError);
        // Log the error but continue with the response to the client
      } else {
        console.log("Notification email sent via Gmail:", info.messageId);
        console.log("Full response:", info.response);
      }
    });

    // Respond to the client
    res.status(201).json({
      message: "Submission successful!",
      invite: newInvite,
    });
  } catch (error) {
    console.error("Submission error:", error);
    if (error.name === "ValidationError") {
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
