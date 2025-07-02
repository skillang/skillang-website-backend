const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// ✅ Enable CORS for your domain
app.use(cors({ origin: "*", credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const fs = require("fs");


// ✅ Replace with your Google Sheet ID
const SHEET_ID = "1Xp_IEXsq1pyo_u6-1We38P0auFdXu4-lKChH6sS2iwk";

// ✅ Load Google Service Account Credentials
console.log("📂 Loading Google Service Account Credentials...");
let CREDENTIALS;
try {
    CREDENTIALS = JSON.parse(fs.readFileSync("skillang-database-2d497fab2a4f.json", "utf8"));
    console.log("✅ Credentials loaded successfully!");
} catch (error) {
    console.error("❌ ERROR: Failed to load credentials file:", error);
    process.exit(1); // Stop the server if credentials are missing
}

// ✅ Authenticate Using google-auth-library
const serviceAccountAuth = new JWT({
    email: CREDENTIALS.client_email,
    key: CREDENTIALS.private_key.replace(/\\n/g, "\n"), // Fixes private key formatting issue
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ✅ New Endpoint to Send Data to Google Sheets
app.post("/submit-to-google-sheets", async (req, res) => {
    try {
        console.log("📩 Received request at /submit-to-google-sheets");

        const { name, email, phone, pincode, lookingFor } = req.body;

        // ✅ Validate Data
        // ✅ Validate Data with Debugging
        const missingFields = [];

        if (!name) missingFields.push("Name");
        if (!email) missingFields.push("Email");
        if (!phone) missingFields.push("Phone");
        if (!pincode) missingFields.push("Pincode");
        if (!lookingFor) missingFields.push("LookingFor");

        if (missingFields.length > 0) {
            console.error("❌ Validation Error: Missing fields in request:", missingFields);
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`
            });
        }

        console.log("✅ All required fields are present. Proceeding with request...");

        console.log("📄 Request data:", req.body);

        // ✅ Connect to Google Sheets
        console.log("📂 Initializing Google Sheets connection...");
        const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);

        console.log("📄 Loading spreadsheet info...");
        await doc.loadInfo(); // Loads document properties and worksheets
        console.log(`✅ Spreadsheet loaded: ${doc.title}`);

        const sheet = doc.sheetsByIndex[0]; // First sheet
        console.log(`📄 Found sheet: ${sheet.title}`);

        // ✅ Append new row with received data
        console.log("📤 Adding data to Google Sheets...");
        await sheet.addRow({ Name: name, Email: email, Phone: phone, Pincode: pincode, LookingFor: lookingFor });

        console.log("✅ Data added successfully!");
        res.json({ success: true, message: "Data submitted Successfully" });

    } catch (error) {
        console.error("❌ ERROR: Failed to save data to Google Sheets.");
        console.error("🔍 Error Details:", error);
        res.status(500).json({ success: false, message: "Error submitting to Google Sheets", error: error.message });
    }
});




// // ✅ Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI || "mongodb+srv://admin:0uomUdTBahyzrjOj@cluster0.mongodb.net/skillang_data?retryWrites=true&w=majority", {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// });

// mongoose.connection.on("connected", () => console.log("✅ MongoDB connected successfully"));
// mongoose.connection.on("error", (err) => console.error("❌ MongoDB connection error:", err));

// ✅ Define Schema & Model
const InquirySchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    pincode: String,
    lookingFor: String,
    otp: String,
});

const Inquiry = mongoose.model("Inquiry", InquirySchema, "enquiry_form");

// ✅ Setup Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ✅ Store OTPs temporarily
const otpStore = {};

// ✅ Send OTP to Email
app.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required!" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    otpStore[email] = otp;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP for Verification",
        text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
    };

    try {
        console.log(`📤 Sending OTP: ${otp} to ${email}`);
        let info = await transporter.sendMail(mailOptions);
        console.log("✅ Email Sent Successfully:", info.response);

        res.json({ success: true, message: "OTP sent successfully!" });
    } catch (error) {
        console.error("❌ Email Send Error:", error);
        res.status(500).json({ success: false, message: "Error sending OTP", error });
    }
});

// ✅ Verify OTP
app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: "Email and OTP are required!" });
    }

    if (otpStore[email] == otp) {
        console.log(`✅ OTP Verified for ${email}`);
        delete otpStore[email];
        res.json({ success: true, message: "OTP verified successfully!" });
    } else {
        console.log(`❌ Invalid OTP Attempt for ${email}`);
        res.status(400).json({ success: false, message: "Invalid OTP" });
    }
});

// ✅ Handle Form Submission
app.post("/submit-inquiry", async (req, res) => {
    try {
        console.log("📩 Received Data:", req.body);
        const inquiry = new Inquiry(req.body);
        await inquiry.save();
        res.json({ message: "✅ Inquiry submitted successfully!" });
    } catch (error) {
        console.error("❌ Error Saving Inquiry:", error);
        res.status(500).json({ message: "❌ Error saving inquiry", error });
    }
});

// ✅ Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://skillang.com:${PORT}`);
});
