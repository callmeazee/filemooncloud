const mongoose = require("mongoose");
const { Schema, model } = require("mongoose");

const fileSchema = new Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    filename: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
    },
    type: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },

    // ── Cloudinary storage (new uploads) ──────────────────────────────────────
    cloudinaryId:  { type: String },   // public_id  → used for deletion
    cloudinaryUrl: { type: String },   // secure_url → used for download

    // ── Legacy disk storage (backward compat for old records) ─────────────────
    storedName: { type: String },      // UUID filename only  e.g. "abc123.pdf"
    path:       { type: String },      // old full-relative path e.g. "files/abc.pdf"
  },
  { timestamps: true },
);

const FileModel = model("File", fileSchema);
module.exports = FileModel;
