const FileModel = require("../model/files.model");
const cloudinary = require("cloudinary").v2;
const fs   = require("fs");
const path = require("path");

// ─── Cloudinary URL → forced download URL ─────────────────────────────────────
// Inserts fl_attachment transformation so the browser downloads instead of previewing.
const toDownloadUrl = (url) => url.replace("/upload/", "/upload/fl_attachment/");

// ─── Backward-compatible resolver for LEGACY disk records ────────────────────
// Old records: { path: "files/uuid.ext" } or { storedName: "uuid.ext" }
const getDiskPath = (file) => {
  if (file.storedName) return path.join(process.cwd(), "files", file.storedName);
  return path.join(process.cwd(), file.path);
};

// Returns a normalised MIME type string
const getType = (mimetype) => {
  if (mimetype === "application/X-msdownload") return "application/exe";
  return mimetype;
};

// ─── Create File ──────────────────────────────────────────────────────────────
const createFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "File required" });

    const { filename } = req.body;
    if (!filename || !filename.trim()) {
      // If uploaded to Cloudinary, clean it up
      if (file.filename) {
        cloudinary.uploader.destroy(file.filename, { resource_type: "raw" }).catch(() => {});
        cloudinary.uploader.destroy(file.filename, { resource_type: "image" }).catch(() => {});
      }
      return res.status(400).json({ message: "Filename is required" });
    }

    const payload = {
      filename:      filename.trim(),
      type:          getType(file.mimetype),
      size:          file.size,
      user:          req.user.id,
      // Cloudinary fields (set by multer-storage-cloudinary)
      cloudinaryId:  file.filename,   // public_id
      cloudinaryUrl: file.path,       // secure_url
    };

    const newFile = await FileModel.create(payload);
    res.status(201).json(newFile);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Fetch Files ──────────────────────────────────────────────────────────────
const fetchFile = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 0;
    const files = await FileModel
      .find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.status(200).json(files);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Delete File ──────────────────────────────────────────────────────────────
const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await FileModel.findOneAndDelete({ _id: id, user: req.user.id });
    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.cloudinaryId) {
      // Try both resource types (Cloudinary auto-detects on upload)
      await Promise.allSettled([
        cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: "raw" }),
        cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: "image" }),
        cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: "video" }),
      ]);
    } else {
      // Legacy: remove from disk
      const filePath = getDiskPath(file);
      fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") console.error("Disk unlink failed:", err.message);
      });
    }

    res.status(200).json(file);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Download File ────────────────────────────────────────────────────────────
const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await FileModel.findOne({ _id: id, user: req.user.id });
    if (!file) return res.status(404).json({ message: "File not found" });

    if (file.cloudinaryUrl) {
      // Cloudinary: redirect to a forced-download URL
      return res.redirect(toDownloadUrl(file.cloudinaryUrl));
    }

    // Legacy: serve from disk
    const ext      = file.type.split("/").pop();
    const filePath = getDiskPath(file);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}.${ext}"`);
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).json({ message: "File not found on disk" });
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createFile, fetchFile, deleteFile, downloadFile };