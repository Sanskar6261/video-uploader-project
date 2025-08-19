import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUpload } from "../context/UploadContext";

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

const MIN_SIZE = 2 * 1024 * 1024;
const MAX_SIZE = 500 * 1024 * 1024;

const isVideoTypeAllowed = (file) => {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  const extOk = name.endsWith(".mp4") || name.endsWith(".webm");
  const typeOk =
    type === "video/mp4" ||
    type === "video/webm" ||
    (type.startsWith("video/") && !type.includes("quicktime"));
  return extOk || typeOk;
};

export default function SelectFile() {
  const navigate = useNavigate();
  const { fileRef } = useUpload();
  const inputRef = useRef(null);
  const didStartRef = useRef(false);

  const [uiError, setUiError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [recOpen, setRecOpen] = useState(false);

  const disabled = isUploading || didStartRef.current;

  const onChange = () => {
    setUiError("");
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setPreview(null);
      if (!fileRef.current || preview?.from === "file") fileRef.current = null;
      return;
    }
    setPreview({
      name: file.name,
      size: file.size,
      type: file.type || "",
      from: "file",
    });
    fileRef.current = file;
  };

  const validateVideo = (file) => {
    if (!file) return "Please select or record a video first.";
    if (!isVideoTypeAllowed(file))
      return "Only MP4 or WebM video files are allowed.";
    if (file.size < MIN_SIZE || file.size > MAX_SIZE)
      return "Please select/record a video between 2–500 MB.";
    return "";
  };

  const handleNext = () => {
    if (didStartRef.current) return;

    setUiError("");

    const file = fileRef.current || inputRef.current?.files?.[0];
    const err = validateVideo(file);
    if (err) return setUiError(err);

    didStartRef.current = true;
    setIsUploading(true);
    fileRef.current = file;
    navigate("/progress");
  };

  const handleGoToListing = () => navigate("/done");

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-100 to-purple-200 p-6">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">
        Screen 1: Select & Upload
      </h1>

      <div className="flex flex-col items-center space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/mov"
          onChange={onChange}
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
        <button
          type="button"
          disabled={disabled}
          onClick={() => setRecOpen(true)}
          className={`px-6 py-2 rounded-lg shadow font-semibold transition
            ${
              disabled
                ? "bg-gray-400 cursor-not-allowed text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
        >
          Record from Camera
        </button>

        {preview && (
          <div className="text-sm bg-white/70 px-4 py-2 rounded-md shadow max-w-md">
            <div>
              <span className="font-medium">File:</span> {preview.name}
            </div>
            <div>
              <span className="font-medium">Size:</span>{" "}
              {fmtBytes(preview.size)}
            </div>
            {preview.type ? (
              <div>
                <span className="font-medium">Type:</span> {preview.type}
              </div>
            ) : null}
            <div className="text-xs text-gray-600 mt-1">
              Source: {preview.from === "recording" ? "Camera" : "Your device"}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Tip: Click “Upload” to start uploading this file.
            </p>
          </div>
        )}

        {uiError && (
          <p className="text-red-600 font-medium text-sm text-center max-w-md">
            {uiError}
          </p>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={disabled}
          className={`mt-2 px-6 py-3 font-semibold rounded-lg shadow-md transition focus:outline-none
            ${
              disabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
        >
          {disabled ? "Uploading..." : "Upload"}
        </button>
        <button
          type="button"
          onClick={handleGoToListing}
          className="mt-2 mb-4 px-6 py-3 text-white font-semibold rounded-lg shadow-md bg-gray-600 hover:bg-gray-700 transition"
        >
          All Videos
        </button>
      </div>
      {recOpen && (
        <RecorderModal
          onClose={() => setRecOpen(false)}
          onSave={(file) => {
            fileRef.current = file;
            setPreview({
              name: file.name,
              size: file.size,
              type: file.type || "",
              from: "recording",
            });
            setUiError("");
            if (inputRef.current) inputRef.current.value = "";
            setRecOpen(false);
          }}
          validateBeforeSave={(file) => validateVideo(file)}
        />
      )}
    </div>
  );
}

function RecorderModal({ onClose, onSave, validateBeforeSave }) {
  const videoRef = useRef(null);
  const mediaRecRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [status, setStatus] = useState("init");
  const [errMsg, setErrMsg] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [supportsRecorder] = useState(
    typeof window !== "undefined" && "MediaRecorder" in window
  );

  const pickMime = () => {
    const cands = [
      "video/mp4;codecs=h264,aac",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mov",
    ];
    for (const c of cands) {
      try {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported?.(c))
          return c;
      } catch {}
    }
    return "video/webm";
  };

  useEffect(() => {
    (async () => {
      if (!supportsRecorder) {
        setErrMsg(
          "Recording is not supported in this browser. Try Chrome, Edge, or a modern Android browser."
        );
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus("ready");
      } catch (e) {
        const msg =
          e?.name === "NotAllowedError"
            ? "Permission denied. Please allow camera and microphone access."
            : e?.name === "NotFoundError"
            ? "No camera/microphone found on this device."
            : e?.name === "NotReadableError"
            ? "Camera or mic is in use by another app. Close it and try again."
            : e?.message || "Could not access camera/microphone.";
        setErrMsg(msg);
        setStatus("error");
      }
    })();

    const onVis = () => {
      if (document.hidden && videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {}
      } else if (!document.hidden && videoRef.current && streamRef.current) {
        try {
          videoRef.current.play();
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(timerRef.current);
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [supportsRecorder]);

  const start = () => {
    setErrMsg("");
    if (!supportsRecorder)
      return setErrMsg("This browser does not support MediaRecorder.");
    if (!streamRef.current) return setErrMsg("Camera is not ready yet.");

    try {
      chunksRef.current = [];
      setSeconds(0);

      const rec = new MediaRecorder(streamRef.current, {
        mimeType: pickMime(),
      });
      mediaRecRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onerror = (ev) => {
        setErrMsg(ev?.error?.message || "Recording error occurred.");
        setStatus("error");
      };
      rec.onstop = () => {
        clearInterval(timerRef.current);
        setStatus("stopped");
      };

      rec.start(1000);
      setStatus("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      setErrMsg(e?.message || "Failed to start recording.");
      setStatus("error");
    }
  };

  const stop = () => {
    setErrMsg("");
    if (!mediaRecRef.current) return;
    try {
      if (mediaRecRef.current.state === "recording") mediaRecRef.current.stop();
    } catch (e) {
      setErrMsg(e?.message || "Failed to stop recording.");
    }
  };

  const discard = () => {
    setErrMsg("");
    chunksRef.current = [];
    setSeconds(0);
    setStatus("ready");
  };

  const save = () => {
    setErrMsg("");
    if (!chunksRef.current.length || !mediaRecRef.current) {
      setErrMsg("No recording to save. Please record again.");
      return;
    }
    const mime = mediaRecRef.current.mimeType || "video/webm";
    const ext = mime.includes("mp4") ? "mp4" : "webm";
    const blob = new Blob(chunksRef.current, { type: mime });
    const file = new File(
      [blob],
      `recording_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`,
      { type: mime, lastModified: Date.now() }
    );

    const vErr = validateBeforeSave?.(file);
    if (vErr) return setErrMsg(vErr);

    onSave?.(file);
  };

  const mmss = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0"
    )}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Record a video</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-black">
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-700">
            Status:{" "}
            {status === "init"
              ? "Initializing…"
              : status === "ready"
              ? "Ready"
              : status === "recording"
              ? "Recording…"
              : status === "stopped"
              ? "Stopped"
              : "Error"}
          </span>
          <span className="px-2 py-1 rounded bg-gray-900 text-white text-sm font-mono">
            {mmss(seconds)}
          </span>
        </div>

        <div className="aspect-video bg-black rounded overflow-hidden mb-3">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
          />
        </div>

        {errMsg && (
          <p className="text-red-600 text-sm mb-3 whitespace-pre-wrap">
            {errMsg}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {(status === "ready" || status === "init") && (
            <button
              onClick={start}
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            >
              Start
            </button>
          )}
          {status === "recording" && (
            <button
              onClick={stop}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
            >
              Stop
            </button>
          )}
          {status === "stopped" && (
            <>
              <button
                onClick={save}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Use this recording
              </button>
              <button
                onClick={discard}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Discard
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 ml-auto"
          >
            Close
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Most browsers record in WebM. If your backend requires MP4, transcode
          server-side or accept <code>video/webm</code>.
        </p>
      </div>
    </div>
  );
}
