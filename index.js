const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
mongoose
  .connect(process.env.DB)
  .then(() => console.log("db connected"))
  .catch((err) => console.log("failed to connect:", err.message));

const express = require("express");
const path = require("path");
const fs = require("fs");
const root = process.cwd();
const cors = require("cors");
const { v4: uniqueId } = require("uuid");
const multer = require("multer");

const cloudinary = require("cloudinary").v2;

// ─── Cloudinary config ────────────────────────────────────────────────────────
// Supports two setups:
//   1. Single var:  CLOUDINARY_URL = cloudinary://api_key:api_secret@cloud_name
//   2. Three vars:  CLOUDINARY_NAME, CLOUDINARY_KEY, CLOUDINARY_SECRET
(function () {
  const url = process.env.CLOUDINARY_URL || "";
  const m   = url.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);

  if (m) {
    cloudinary.config({ api_key: m[1], api_secret: m[2], cloud_name: m[3] });
    console.log("Cloudinary: configured via CLOUDINARY_URL → cloud:", m[3]);
  } else if (process.env.CLOUDINARY_NAME && process.env.CLOUDINARY_KEY && process.env.CLOUDINARY_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key:    process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });
    console.log("Cloudinary: configured via separate vars → cloud:", process.env.CLOUDINARY_NAME);
  } else {
    console.warn("Cloudinary: no valid credentials found — uploads will fail");
  }
})();


// ─── Multer: store in memory, controllers upload buffer to Cloudinary ─────────
// Render free tier = 512 MB RAM. Files pass through memory → Cloudinary.
// 25 MB per file keeps multiple concurrent uploads safe.
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 },  // 25 MB
});

const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 2 * 1024 * 1024 },   // 2 MB for avatars
});


const {
  signUpController,
  loginController,
  updateImageController,
  fetchProfilePicture,
} = require("./controller/user.controller");
const {
  createFile,
  fetchFile,
  deleteFile,
  downloadFile,
} = require("./controller/file.controller");
const { fetchDashboard } = require("./controller/dashboard.controller");
const { verifyToken } = require("./controller/token.controller");
const { shareFile, fetchShared, downloadShared } = require("./controller/share.controller");
const AuthMiddleware = require("./middleware/auth.middleware");

const app = express();

// ─── Middleware (must be before routes) ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("view"));

// ─── UI Routes ────────────────────────────────────────────────────────────────
const getPath = (filename) => path.join(root, "view", filename);

app.get("/share/:fileId", downloadShared);  // Public — no auth (used by email link)
app.get("/signup", (req, res) => res.sendFile(getPath("signup.html")));
app.get("/login",  (req, res) => res.sendFile(getPath("index.html")));
app.get("/",       (req, res) => res.sendFile(getPath("index.html")));
app.get("/dashboard", (req, res) => res.sendFile(getPath("app/dashboard.html")));
app.get("/history",   (req, res) => res.sendFile(getPath("app/history.html")));
app.get("/file",      (req, res) => res.sendFile(getPath("app/files.html")));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.post("/api/signup", signUpController);
app.post("/api/login",  loginController);
app.post("/api/profile-picture", AuthMiddleware, profileUpload.single("profilePic"), updateImageController);
app.get("/api/profile-picture",  AuthMiddleware, fetchProfilePicture);
app.post("/api/file",            AuthMiddleware, upload.single("file"),              createFile);
app.get("/api/file",  AuthMiddleware, fetchFile);
// NOTE: /api/file/download/:id MUST be registered before /api/file/:id
// otherwise Express treats the word 'download' as the :id parameter
app.get("/api/file/download/:id",  AuthMiddleware, downloadFile);
app.delete("/api/file/:id",        AuthMiddleware, deleteFile);

app.get("/api/dashboard", AuthMiddleware, fetchDashboard);
app.post("/api/token/verify", verifyToken);
app.post("/api/share", AuthMiddleware, shareFile);
app.get("/api/share",  AuthMiddleware, fetchShared);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is listening on port ${PORT}`);
  console.log(`DB: ${process.env.DB ? "configured ✓" : "MISSING ✗"}`);
  console.log(`SMTP: ${process.env.SMTP_EMAIL ? process.env.SMTP_EMAIL + " ✓" : "MISSING ✗"}`);
  console.log(`DOMAIN: ${process.env.DOMAIN || "not set"}`);
});