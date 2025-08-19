// Progress.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUpload } from "../context/UploadContext";
import api from "../api";
import ProgressBar from "../components/ProgressBar";

const fmtBytes = (n) => {
  if (!Number.isFinite(n)) return "-";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
};
const fmtSpeed = (bps) => (Number.isFinite(bps) ? `${fmtBytes(bps)}/s` : "—");

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
  const [speed, setSpeed] = useState(null); // NEW
  const [countdown, setCountdown] = useState(null);
  const [phase, setPhase] = useState("uploading");
  const startRef = useRef(null);
  const speedSamples = useRef([]);
  const finalizeTimer = useRef(null);

  // countdown while uploading
  useEffect(() => {
    if (phase !== "uploading") return;
    if (eta == null) return;
    setCountdown(Math.ceil(eta));
    const id = setInterval(() => {
      setCountdown((c) => (c && c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [eta, phase]);

  // gentle creep during finalizing
  useEffect(() => {
    if (phase !== "finalizing") return;
    finalizeTimer.current = setInterval(() => {
      setPct((p) => (p < 99 ? Math.min(99, p + 0.2) : p));
    }, 1000);
    return () => clearInterval(finalizeTimer.current);
  }, [phase]);

  useEffect(() => {
    const file = fileRef.current;
    if (!file) return navigate("/");

    const doUpload = async () => {
      setErr("");
      setPct(0);
      setEta(null);
      setSpeed(null);
      setCountdown(null);
      setPhase("uploading");
      startRef.current = Date.now();
      speedSamples.current = [];

      try {
        const fd = new FormData();
        fd.append("file", file);

        await api
          .post("/files/upload", fd, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 0,
            onUploadProgress: (e) => {
              if (!e.total) return;

              const now = Date.now();
              const elapsedSec = (now - startRef.current) / 1000;
              const { loaded, total } = e;

              // progress (cap at 98)
              const progress = Math.min(98, Math.round((loaded / total) * 100));
              setPct(progress);

              // moving-average speed
              const inst = loaded / Math.max(elapsedSec, 0.001);
              speedSamples.current.push(inst);
              if (speedSamples.current.length > 10)
                speedSamples.current.shift();
              const avgSpeed =
                speedSamples.current.reduce((a, b) => a + b, 0) /
                speedSamples.current.length;
              setSpeed(avgSpeed); // NEW

              // ETA
              const remainingBytes = total - loaded;
              const etaSec = remainingBytes / Math.max(avgSpeed, 1);
              setEta(etaSec);

              // switch to finalizing when bytes finished
              if (loaded === total) {
                setPhase("finalizing");
                setPct((p) => Math.max(p, 99));
              }
            },
          })
          .then((res) => {
            setUploaded(res.data);
            setPhase("done");
            setPct(100);
          });

        navigate("/done");
      } catch (e) {
        console.error(e);
        setPhase("error");
        setErr(e?.response?.data?.message || e.message || "Upload failed");
      }
    };

    doUpload();
  }, [fileRef, navigate, setUploaded]);

  const file = fileRef.current;
  const phaseText =
    phase === "uploading"
      ? countdown != null
        ? `Uploading… Remaining: ${formatETA(countdown)}`
        : "Uploading… Estimating…"
      : phase === "finalizing"
      ? "Finalizing on server (saving/processing)…"
      : phase === "done"
      ? "Upload complete!"
      : "Upload failed";

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-100 to-purple-200 p-6">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">
        Screen 2: {phase === "finalizing" ? "Finalizing…" : "Uploading…"}
      </h1>

      {/* Stats card */}
      {file && (
        <div className="w-full max-w-xl mb-4 bg-white/80 rounded-lg p-4 shadow">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">File:</span> {file.name}
            </div>
            <div>
              <span className="font-medium">Size:</span> {fmtBytes(file.size)}
            </div>
            <div>
              <span className="font-medium">Speed:</span> {fmtSpeed(speed)}
            </div>
            <div>
              <span className="font-medium">ETA:</span>{" "}
              {formatETA(countdown) ?? "—"}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-xl mb-2">
        <ProgressBar value={pct} className="h-6 rounded-lg overflow-hidden" />
      </div>

      <div className="flex flex-col sm:flex-row items-baseline gap-4 mb-4">
        <strong className="text-lg">{Math.floor(pct)}%</strong>
        <span className="text-gray-700">{phaseText}</span>
      </div>

      {err && (
        <p className="text-red-600 font-medium text-sm text-center">{err}</p>
      )}
    </div>
  );
}
