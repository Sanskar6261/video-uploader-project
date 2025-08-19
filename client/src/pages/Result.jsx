import { useEffect, useState } from "react";
import { useUpload } from "../context/UploadContext";
import api, { API_BASE } from "../api";

const fmtBytes = (n) => {
  if (!Number.isFinite(n)) return "-";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
};

export default function Result() {
  let uploaded, setUploaded;
  try {
    ({ uploaded, setUploaded } = useUpload());
  } catch {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-100 to-purple-200 p-6">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-4 text-center">
          Screen 3: Uploaded Files
        </h1>
        <p className="text-red-600 text-center">
          UploadProvider is not mounted. Wrap your app with
          &lt;UploadProvider&gt;.
        </p>
      </div>
    );
  }

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const refresh = async () => {
    try {
      setErr("");
      setLoading(true);
      const res = await api.get("/files/list");
      if (!Array.isArray(res.data))
        throw new Error("Unexpected response shape");
      setList(res.data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = async (filename) => {
    try {
      await api.delete(`/files/${encodeURIComponent(filename)}`);
      if (uploaded?.filename === filename) setUploaded?.(null);
      await refresh();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Delete failed");
    }
  };

  const currentUrl = uploaded?.filename
    ? `${API_BASE}/video/${encodeURIComponent(uploaded.filename)}`
    : null;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-100 to-purple-200 p-6">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-6 text-center">
        Screen 3: Uploaded Files
      </h1>

      {err && <p className="text-red-600 font-medium mb-4">{err}</p>}

      {currentUrl ? (
        <div className="w-full max-w-2xl mb-6 bg-white rounded-lg shadow-md p-4">
          <h3 className="text-xl font-semibold mb-3">Just uploaded</h3>

          <div className="text-sm text-gray-700 mb-2">
            <div>
              <span className="font-medium">File:</span> {uploaded.filename}
            </div>
            {typeof uploaded.size === "number" && (
              <div>
                <span className="font-medium">Size:</span>{" "}
                {fmtBytes(uploaded.size)}
              </div>
            )}
          </div>

          <video src={currentUrl} controls className="w-full rounded-lg" />
          <div className="mt-3">
            <button
              onClick={() => handleDelete(uploaded.filename)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <p>No recent upload in this session.</p>
      )}

      <h3 className="text-xl font-semibold mt-8 mb-2">All files on server</h3>
      {loading && <p>Loading…</p>}
      {!loading && list.length === 0 && <p>None yet.</p>}

      {!loading && list.length > 0 && (
        <ul className="w-full max-w-2xl space-y-4">
          {list.map((f) => {
            const url = `${API_BASE}/video/${encodeURIComponent(f.filename)}`;
            const displayName =
              f.originalname || f.filename.replace(/^\d+_/, "");
            return (
              <li
                key={f.filename}
                className="p-4 bg-white rounded-lg shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="text-sm text-gray-700">
                    <div className="font-medium break-all">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {displayName}
                      </a>
                    </div>
                    {typeof f.size === "number" && (
                      <div className="text-gray-600">
                        Size: {fmtBytes(f.size)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(f.filename)}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition self-start sm:self-auto"
                  >
                    Delete
                  </button>
                </div>
                <video src={url} controls className="w-full rounded-md" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
