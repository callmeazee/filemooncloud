const FileModel = require("../model/files.model");
const cloudinary = require("cloudinary").v2;

// Returns a normalised MIME type string
const getType = (mimetype) => {
  if (mimetype === "application/X-msdownload") return "application/exe";
  return mimetype;
};

// ─── Cloudinary upload helper (buffer → cloud) ────────────────────────────────
const uploadToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) {
        console.error("[Cloudinary upload_stream error]", JSON.stringify(err));
        reject(err);
      } else {
        resolve(result);
      }
    });
    stream.end(buffer);
  });

// ─── Cloudinary URL → forced-download URL ────────────────────────────────────
const toDownloadUrl = (url) => url.replace("/upload/", "/upload/fl_attachment/");

// ─── Create File ──────────────────────────────────────────────────────────────
const createFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "File required" });

    const { filename } = req.body;
    if (!filename || !filename.trim()) {
      return res.status(400).json({ message: "Filename is required" });
    }

    // Upload buffer to Cloudinary
    const cfg = cloudinary.config();
    console.log("[createFile] Cloudinary cloud_name:", cfg.cloud_name || "NOT SET");
    const result = await uploadToCloudinary(file.buffer, {
      folder:        "filemoon",
      resource_type: "auto",     // handles any file type
      use_filename:  false,
    });

    const payload = {
      filename:      filename.trim(),
      type:          getType(file.mimetype),
      size:          file.size,
      user:          req.user.id,
      cloudinaryId:  result.public_id,
      cloudinaryUrl: result.secure_url,
    };

    const newFile = await FileModel.create(payload);
    res.status(201).json(newFile);

  } catch (err) {
    const msg = err?.message || err?.error?.message || JSON.stringify(err) || "Unknown Cloudinary error";
    console.error("[createFile] Cloudinary error:", msg);
    res.status(500).json({ message: msg });
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
      // Try all resource types (Cloudinary stores under the detected type)
      await Promise.allSettled([
        cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: "raw" }),
        cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: "image" }),
        cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: "video" }),
      ]);
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
      return res.redirect(toDownloadUrl(file.cloudinaryUrl));
    }

    // Legacy disk records
    const path     = require("path");
    const ext      = file.type.split("/").pop();
    const filePath = file.storedName
      ? path.join(process.cwd(), "files", file.storedName)
      : path.join(process.cwd(), file.path);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}.${ext}"`);
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).json({ message: "File not found on disk" });
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createFile, fetchFile, deleteFile, downloadFile };