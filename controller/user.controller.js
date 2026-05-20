const UserModel = require("../model/user.model");
const cloudinary = require("cloudinary").v2;
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');

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

    const payload = {
      id:       user._id,
      email:    user.email,
      fullname: user.fullname,
      mobile:   user.mobile,
    };

    const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '7d' });
    return res.status(200).json({ message: "Signed in successfully", token });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Update Profile Picture ───────────────────────────────────────────────────
// req.file is populated by multer-storage-cloudinary:
//   req.file.path     = Cloudinary secure_url
//   req.file.filename = Cloudinary public_id
const updateImageController = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Image file required" });

    const newUrl      = req.file.path;       // Cloudinary secure URL
    const newPublicId = req.file.filename;   // Cloudinary public_id

    // Delete old avatar from Cloudinary (best-effort)
    const existing = await UserModel.findById(req.user.id).select("imagePublicId");
    if (existing && existing.imagePublicId) {
      cloudinary.uploader.destroy(existing.imagePublicId, { resource_type: "image" }).catch(() => {});
    }

    const user = await UserModel.findByIdAndUpdate(
      req.user.id,
      { image: newUrl, imagePublicId: newPublicId },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    // Return the Cloudinary URL directly so the frontend can update the avatar immediately
    return res.status(200).json({ image: newUrl });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Fetch Profile Picture ────────────────────────────────────────────────────
// Now returns the Cloudinary URL as JSON instead of streaming the file from disk.
const fetchProfilePicture = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id).select('image');

    if (!user || !user.image) {
      return res.status(204).end(); // No picture set — frontend silently ignores 204
    }

    // If it's a Cloudinary URL (new), return it as JSON
    if (user.image.startsWith("http")) {
      return res.status(200).json({ image: user.image });
    }

    // Legacy: old records stored just the filename — return 204 (can't serve from disk on Render)
    return res.status(204).end();

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  signUpController,
  loginController,
  updateImageController,
  fetchProfilePicture,
};