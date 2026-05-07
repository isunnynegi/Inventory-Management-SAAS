import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { basePlugin } from "../../common/basePlugin.js";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ["superAdmin","admin","staff"], default: "staff" },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", index: true },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  refreshTokens: { type: [{ token: String, expiresAt: Date, userAgent: String }], select: false },
  loginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false },
  lastLogin: { type: Date },
  avatar: { type: String },
  inviteToken: { type: String, select: false },
  inviteExpires: { type: Date, select: false },
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ organizationId: 1, role: 1 });

userSchema.virtual("isLocked").get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now())
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked)
    updates.$set = { lockUntil: new Date(Date.now() + 2*60*60*1000) };
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({ $unset: { loginAttempts: 1, lockUntil: 1 } });
};

userSchema.plugin(basePlugin);
const User = mongoose.model("User", userSchema);
export default User;
