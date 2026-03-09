const mongoose = require("mongoose")
const bcrypt   = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type:     String,
      required: [true, "First name is required"],
      trim:     true,
    },
    lastName: {
      type:     String,
      required: [true, "Last name is required"],
      trim:     true,
    },
    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type:      String,
      required:  [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    phone: {
      type:  String,
      trim:  true,
    },
    role: {
      type:    String,
      enum:    ["athlete", "recruiter"],
      required: true,
    },

    // Athlete-specific fields
    dateOfBirth: {
      type: Date,
    },

    // Recruiter-specific fields
    organization: {
      type:  String,
      trim:  true,
    },
    recruiterPosition: {
      type:  String,
      trim:  true,
    },
  },
  {
    timestamps: true,
  }
)

// ── Hash password before saving ──────────────────────────────
// This runs automatically every time a user is saved
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  const salt    = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// ── Method to compare passwords on login ────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

module.exports = mongoose.model("User", userSchema)