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
    // Stores only the UUID filename (e.g. "abc123.pdf"), NOT the full path.
    // Full path is always reconstructed at read-time via path.join(cwd, 'files', storedName).
    storedName: {
      type: String,
      trim: true,
      required: true,
    },
    type: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
    },
    // Note: `trim` is a String-only validator; removed from Number field
    size: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

const FileModel = model("File", fileSchema);

module.exports = FileModel;
