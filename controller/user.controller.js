const UserModel = require("../model/user.model");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

// ─── Sign Up ──────────────────────────────────────────────────────────────────
const signUpController = async (req, res) => {
  try {
    // Destructure only expected fields — never pass raw req.body to .create()
    const { fullname, email, mobile, password } = req.body;

    if (!fullname || !email || !mobile || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check for existing email/mobile before attempting to save
    const existingEmail  = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already exists" });
    }
    const existingMobile = await UserModel.findOne({ mobile: mobile.trim() });
    if (existingMobile) {
      return res.status(409).json({ message: "Mobile number already exists" });
    }

    await UserModel.create({ fullname, email, mobile, password });

    // Never return the user document — it contains the hashed password
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
const updateImageController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file required" });
    }
    const { filename } = req.file;
    const user = await UserModel.findByIdAndUpdate(
      req.user.id,
      { image: filename },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ image: filename });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Fetch Profile Picture ────────────────────────────────────────────────────
const fetchProfilePicture = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id).select('image');
    // Return 204 (No Content) when no picture is set — avoids a red Axios error
    // in the browser console since the frontend silently ignores this case anyway.
    if (!user || !user.image) {
      return res.status(204).end();
    }
    const filePath = path.join(process.cwd(), 'files', user.image);
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).json({ message: "Image not found" });
    });

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