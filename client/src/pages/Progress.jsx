import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUpload } from "../context/UploadContext";
import api from "../api";
import ProgressBar from "../components/ProgressBar";

function formatETA(seconds) {
  if (!Number.isFinite(seconds)) return null;
  if (seconds < 1) return "<1s";
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return m ? `${m}m ${s}s` : `${s}s`;
}

export default function Progress() {
  const { fileRef, setUploaded } = useUpload();
  const navigate = useNavigate();

  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const [eta, setEta] = useState(null);

  const startRef = useRef(null);
  const speedSamples = useRef([]);

  useEffect(() => {
    const file = fileRef.current;
    if (!file) return navigate("/");

    const doUpload = async () => {
      setErr("");
      setPct(0);
      setEta(null);
      startRef.current = Date.now();
      speedSamples.current = [];

      try {
        const fd = new FormData();
        fd.append("file", file);

        await api
          .post("/files/upload", fd, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (e) => {
              if (!e.total) return;

              const now = Date.now();
              const elapsedSec = (now - startRef.current) / 1000;
              const loaded = e.loaded;
              const total = e.total;
              const progress = Math.round((loaded / total) * 100);
              setPct(progress);

              const inst = loaded / Math.max(elapsedSec, 0.001);
              speedSamples.current.push(inst);
              if (speedSamples.current.length > 10)
                speedSamples.current.shift();
              const avgSpeed =
                speedSamples.current.reduce((a, b) => a + b, 0) /
                speedSamples.current.length;

              const remainingBytes = total - loaded;
              const etaSec = remainingBytes / Math.max(avgSpeed, 1);
              setEta(etaSec);
            },
          })
          .then((res) => {
            setUploaded(res.data);
          });

        navigate("/done");
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || e.message || "Upload failed");
      }
    };

    doUpload();
  }, [fileRef, navigate, setUploaded]);

  return (
    <div className="page">
      <h1>Screen 2: Uploading…</h1>
      <ProgressBar value={pct} />

      <div
        style={{
          marginTop: 8,
          display: "flex",
          gap: 12,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <strong>{pct}%</strong>
        <span>
          {eta != null
            ? `Estimated time to upload: ≈ ${formatETA(eta)}`
            : "Estimating…"}
        </span>
      </div>

      {err && <p className="error">{err}</p>}
    </div>
  );
}
