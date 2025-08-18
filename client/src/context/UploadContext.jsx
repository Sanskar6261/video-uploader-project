import { createContext, useContext, useRef, useState } from "react";
import api, { API_BASE } from "../api";
import axios from "axios";

const UploadContext = createContext(null);
export const useUpload = () => useContext(UploadContext);

export default function UploadProvider({ children, navigate }) {
  const fileRef = useRef(null);
  const [progress, setProgress] = useState(0); 
  const [eta, setEta] = useState(null); 
  const [speed, setSpeed] = useState(null); 
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(null); 

  const startUpload = async () => {
    const file = fileRef.current;
    if (!file) throw new Error("No file");
    if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4"))
      throw new Error("Only MP4 files are allowed.");
    if (file.size < 10 * 1024 * 1024)
      throw new Error("File must be at least 10 MB.");
    if (file.size > 50 * 1024 * 1024) throw new Error("File must be ≤ 50 MB.");

    setProgress(0);
    setEta(null);
    setSpeed(null);
    setUploading(true);

    const form = new FormData();
    form.append("file", file);

    const startTs = Date.now();
    let lastLoaded = 0,
      lastTs = startTs;

    try {
      const res = await axios.post(`${API_BASE}/api/files/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (!e.total) return;
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);

          const now = Date.now();
          const deltaBytes = e.loaded - lastLoaded;
          const deltaTime = (now - lastTs) / 1000; 
          if (deltaTime > 0 && deltaBytes >= 0) {
            const instSpeed = deltaBytes / deltaTime;
            setSpeed(instSpeed);
            const remaining = e.total - e.loaded;
            const instEta = remaining / instSpeed;
            setEta(Math.max(0, Math.round(instEta)));
          }
          lastLoaded = e.loaded;
          lastTs = now;
        },
      });

      setUploaded(res.data);
      setUploading(false);
      navigate("/done");
    } catch (err) {
      setUploading(false);
      throw err;
    }
  };

  const value = {
    fileRef,
    progress,
    eta,
    speed,
    uploading,
    uploaded,
    setUploaded,
    startUpload,
  };

  return (
    <UploadContext.Provider value={value}>{children}</UploadContext.Provider>
  );
}
