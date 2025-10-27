/**
 * app.js
 * Single-file Student Management System (MVC-like) using Express + Mongoose
 *
 * Usage:
 * 1. npm install express mongoose express-validator morgan dotenv
 * 2. Start local MongoDB or change MONGO_URI below
 * 3. node app.js
 */

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const { body, validationResult } = require("express-validator");

const app = express();
app.use(express.json());
app.use(morgan("dev"));

/* ========== Configuration ========== */
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/studentDB";

/* ========== DB Connection ========== */
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

/* ========== Model (Student) ========== */
const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name required"], trim: true, minlength: 2 },
    age: { type: Number, required: [true, "Age required"], min: 1, max: 150 },
    course: { type: String, required: [true, "Course required"], trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

const Student = mongoose.model("Student", studentSchema);

/* ========== Controller-like functions ========== */

async function createStudent(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, age, course } = req.body;
    const student = new Student({ name, age, course });
    const saved = await student.save();
    return res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
}

async function getAllStudents(req, res, next) {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    return res.json(students);
  } catch (err) {
    next(err);
  }
}

async function getStudentById(req, res, next) {
  try {
    const s = await Student.findById(req.params.id);
    if (!s) return res.status(404).json({ message: "Student not found" });
    return res.json(s);
  } catch (err) {
    if (err.name === "CastError") return res.status(400).json({ message: "Invalid student ID" });
    next(err);
  }
}

async function updateStudent(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const updated = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) return res.status(404).json({ message: "Student not found" });
    return res.json(updated);
  } catch (err) {
    if (err.name === "CastError") return res.status(400).json({ message: "Invalid student ID" });
    next(err);
  }
}

async function deleteStudent(req, res, next) {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Student not found" });
    return res.json({ message: "Student deleted", student: deleted });
  } catch (err) {
    if (err.name === "CastError") return res.status(400).json({ message: "Invalid student ID" });
    next(err);
  }
}

/* ========== Routes (wire up controller functions) ========== */

const createValidation = [
  body("name").isString().trim().isLength({ min: 2 }).withMessage("name must be at least 2 chars"),
  body("age").isInt({ min: 1, max: 150 }).withMessage("age must be a valid number"),
  body("course").isString().trim().notEmpty().withMessage("course is required")
];

const updateValidation = [
  body("name").optional().isString().trim().isLength({ min: 2 }),
  body("age").optional().isInt({ min: 1, max: 150 }),
  body("course").optional().isString().trim().notEmpty()
];

app.post("/students", createValidation, createStudent);
app.get("/students", getAllStudents);
app.get("/students/:id", getStudentById);
app.put("/students/:id", updateValidation, updateStudent);
app.delete("/students/:id", deleteStudent);

/* ========== Fallback & Error Handler ========== */
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

/* ========== Start ========== */
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
