const UserModel  = require("../model/user.model");
const cloudinary = require("cloudinary").v2;
const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');

// ─── Cloudinary upload helper (buffer → cloud) ────────────────────────────────
const uploadToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    stream.end(buffer);
  });

// ─── Sign Up ──────────────────────────────────────────────────────────────────
const signUpController = async (req, res) => {
  try {
    const { fullname, email, mobile, password } = req.body;
    if (!fullname || !email || !mobile || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingEmail  = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) return res.status(409).json({ message: "Email already exists" });
    const existingMobile = await UserModel.findOne({ mobile: mobile.trim() });
    if (existingMobile) return res.status(409).json({ message: "Mobile number already exists" });
    await UserModel.create({ fullname, email, mobile, password });
    return res.status(201).json({ message: "Account created successfully!" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "User not found" });
    const isLogin = bcrypt.compareSync(password, user.password);
    if (!isLogin) return res.status(401).json({ message: "Invalid password" });
    const payload = { id: user._id, email: user.email, fullname: user.fullname, mobile: user.mobile };
    const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '7d' });
    return res.status(200).json({ message: "Signed in successfully", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Update Profile Picture ───────────────────────────────────────────────────
const updateImageController = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Image file required" });

    // Delete old avatar from Cloudinary first (best-effort)
    const existing = await UserModel.findById(req.user.id).select("imagePublicId");
    if (existing?.imagePublicId) {
      cloudinary.uploader.destroy(existing.imagePublicId, { resource_type: "image" }).catch(() => {});
    }

    // Upload new avatar buffer to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder:         "filemoon/avatars",
      resource_type:  "image",
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
    });

    await UserModel.findByIdAndUpdate(req.user.id, {
      image:        result.secure_url,
      imagePublicId: result.public_id,
    });

    return res.status(200).json({ image: result.secure_url });

  } catch (err) {
    console.error("[updateImageController] Cloudinary error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ─── Fetch Profile Picture ────────────────────────────────────────────────────
const fetchProfilePicture = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id).select('image');
    if (!user || !user.image) return res.status(204).end();
    // Cloudinary URL (new) — return as JSON
    if (user.image.startsWith("http")) {
      return res.status(200).json({ image: user.image });
    }
    // Legacy disk filename — can't serve on Render, return 204 gracefully
    return res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { signUpController, loginController, updateImageController, fetchProfilePicture };