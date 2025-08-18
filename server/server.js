import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import filesRouter from "./routes/files.js";

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json());

if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) =>
      console.warn("Mongo connect failed (running without DB):", err.message)
    );
}

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
app.use(
  "/video",
  express.static(UPLOAD_DIR, { acceptRanges: true, index: false })
);

app.use("/api/files", filesRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
