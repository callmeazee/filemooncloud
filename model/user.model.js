const bcrypt = require('bcrypt');
const { Schema, model } = require("mongoose");

const userSchema = new Schema({
  image: {
    type: String,
  },
  fullname: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    required: true,
    unique: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email"],
  },
  password: {
    type: String,
    trim: true,
    required: true,
  },
}, { timestamps: true });


// ─── Pre-save: Hash password ───────────────────────────────────────────────────
// NOTE: Uniqueness for email/mobile is enforced by the `unique: true` index above.
// Doing a countDocuments check in a pre-save hook is a race condition and the
// hook never called next() on success, hanging the pipeline. Removed those hooks.
userSchema.pre("save", async function (next) {
  // Only re-hash if the password field was modified (e.g. not on profile-pic update)
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password.toString(), 12);
  next();
});


const UserModel = model("User", userSchema);

module.exports = UserModel;
