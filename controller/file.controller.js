const FileModel = require("../model/files.model");
const fs   = require("fs");
const path = require("path");

// Returns a normalised MIME type string
const getType = (mimetype) => {
  const ext = mimetype.split("/").pop();
  if (ext === "X-msdownload") return "application/exe";
  return mimetype;
};

// ─── Backward-compatible path resolver ───────────────────────────────────────
// Files uploaded BEFORE the audit have: { path: "files/uuid.ext" }   (full relative path)
// Files uploaded AFTER  the audit have: { storedName: "uuid.ext" }   (filename only)
// This helper handles both so downloads work for ALL existing records.
const getFilePath = (file) => {
  if (file.storedName) {
    return path.join(process.cwd(), "files", file.storedName);
  }
  // Legacy: file.path was stored as "files/uuid.ext" relative to cwd
  return path.join(process.cwd(), file.path);
};

// ─── Create File ──────────────────────────────────────────────────────────────
const createFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "File required" });
    }

    const { filename } = req.body;
    if (!filename || !filename.trim()) {
      // Clean up uploaded file if no name provided
      fs.unlink(file.path, () => {});
      return res.status(400).json({ message: "Filename is required" });
    }

    const payload = {
      storedName: file.filename,          // UUID filename only, not the full path
      filename:   filename.trim(),
      type:       getType(file.mimetype),
      size:       file.size,
      user:       req.user.id,
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
    const limit = parseInt(req.query.limit, 10) || 0;   // 0 = no limit in Mongoose
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
// FIX: use findOneAndDelete (not findByIdAndDelete) so the `user` filter is honoured.
// findByIdAndDelete ignores extra fields — this was an authorization bypass.
const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await FileModel.findOneAndDelete({ _id: id, user: req.user.id });

    if (!file) return res.status(404).json({ message: "File not found" });

    // Remove from disk; don't throw if already missing
    const filePath = getFilePath(file);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT") {
        console.error("Failed to delete file from disk:", err.message);
      }
    });

    res.status(200).json(file);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Download File ────────────────────────────────────────────────────────────
// FIX: use findOne (not findById) so the `user` filter is honoured.
// findById ignores extra fields — this was an authorization bypass.
const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await FileModel.findOne({ _id: id, user: req.user.id });

    if (!file) return res.status(404).json({ message: "File not found" });

    const ext      = file.type.split("/").pop();
    const filePath = getFilePath(file);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.filename}.${ext}"`
    );

    res.sendFile(filePath, (err) => {
      if (err) res.status(404).json({ message: "Failed to download file" });
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createFile, fetchFile, deleteFile, downloadFile };