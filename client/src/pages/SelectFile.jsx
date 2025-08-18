import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUpload } from "../context/UploadContext";

export default function SelectFile() {
  const navigate = useNavigate();
  const { fileRef } = useUpload();
  const inputRef = useRef(null);

  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const didStartRef = useRef(false);

  const handleNext = () => {
    if (didStartRef.current) return;

    setError("");

    const file = inputRef.current?.files?.[0];
    if (!file) return setError("Please select an MP4 file (10–100 MB).");
    if (file.type !== "video/mp4")
      return setError("Only MP4 files are allowed.");

    const min = 10 * 1024 * 1024;
    const max = 500 * 1024 * 1024;
    if (file.size < min || file.size > max) {
      return setError("Please select an MP4 file between 10–500 MB.");
    }

    didStartRef.current = true;
    setIsUploading(true);

    fileRef.current = file;
    navigate("/progress");
  };

  const disabled = isUploading || didStartRef.current;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-100 to-purple-200 p-6">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">
        Screen 1: Select & Upload
      </h1>

      <div className="flex flex-col items-center space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4"
          disabled={disabled}
          className={`file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-600 file:text-white
                      hover:file:bg-blue-700
                      cursor-pointer ${
                        disabled ? "opacity-60 pointer-events-none" : ""
                      }`}
        />

        {error && <p className="text-red-600 font-medium text-sm">{error}</p>}

        <button
          type="button"
          onClick={handleNext}
          disabled={disabled}
          className={`mt-2 px-6 py-3 font-semibold rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75
            ${
              disabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
        >
          {disabled ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
}
