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
  const [countdown, setCountdown] = useState(null);
  const [phase, setPhase] = useState("uploading"); 
  const startRef = useRef(null);
  const speedSamples = useRef([]);
  const finalizeTimer = useRef(null);


  useEffect(() => {
    if (phase !== "uploading") return; 
    if (eta == null) return;
    setCountdown(Math.ceil(eta));
    const id = setInterval(() => {
      setCountdown((c) => (c && c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [eta, phase]);

  useEffect(() => {
    if (phase !== "finalizing") return;
    finalizeTimer.current = setInterval(() => {
      setPct((p) => (p < 99 ? Math.min(99, p + 0.2) : p));
    }, 1000);
    return () => {
      if (finalizeTimer.current) clearInterval(finalizeTimer.current);
    };
  }, [phase]);

  useEffect(() => {
    const file = fileRef.current;
    if (!file) return navigate("/");

    const doUpload = async () => {
      setErr("");
      setPct(0);
      setEta(null);
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

              const progress = Math.min(98, Math.round((loaded / total) * 100));
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

      <div className="w-full max-w-xl mb-4">
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
