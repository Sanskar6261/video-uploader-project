import { useUpload } from "../context/UploadContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function SelectFile() {
  const navigate = useNavigate();
  const { fileRef } = useUpload();
  const [error, setError] = useState("");

  const handleNext = () => {
    setError("");
    const fileInput = document.getElementById("file");
    const file = fileInput?.files?.[0];
    if (!file) return setError("Please select an MP4 file (10–50 MB).");
    fileRef.current = file;
    navigate("/progress");
  };

  return (
    <div className="page">
      <h1>Screen 1: Select & Upload</h1>
      <input id="file" type="file" accept="video/mp4" />
      {error && <p className="error">{error}</p>}
      <button onClick={handleNext}>Upload</button>
    </div>
  );
}
