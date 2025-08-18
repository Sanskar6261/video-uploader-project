import mongoose from "mongoose";

const FileMetaSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, index: true, unique: true },
    originalname: String,
    size: Number,
    mimetype: String,
  },
  { timestamps: true }
);

export default mongoose.models.FileMeta ||
  mongoose.model("FileMeta", FileMetaSchema);
