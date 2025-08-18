import { useEffect, useState } from "react";
import { useUpload } from "../context/UploadContext";
import api, { API_BASE } from "../api";

export default function Result() {
  // Guard if context missing (prevents crash → blank page)
  let uploaded, setUploaded;
  try {
    ({ uploaded, setUploaded } = useUpload());
  } catch {
    return (
      <div className="page">
        <h1>Screen 3: Uploaded Files</h1>
        <p style={{ color: "crimson" }}>
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
    <div className="page">
      <h1>Screen 3: Uploaded Files</h1>

      {err && <p style={{ color: "crimson", marginTop: 8 }}>{err}</p>}

      {currentUrl ? (
        <>
          <h3>Just uploaded</h3>
          <video src={currentUrl} controls width="640" />
          <div style={{ marginTop: 8 }}>
            <button onClick={() => handleDelete(uploaded.filename)}>
              Delete
            </button>
          </div>
        </>
      ) : (
        <p>No recent upload in this session.</p>
      )}

      <h3 style={{ marginTop: 24 }}>All files on server</h3>

      {loading && <p>Loading…</p>}
      {!loading && list.length === 0 && <p>None yet.</p>}

      {!loading && list.length > 0 && (
        <ul>
          {list.map((f) => {
            const url = `${API_BASE}/video/${encodeURIComponent(f.filename)}`;
            return (
              <li key={f.filename} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <a href={url} target="_blank" rel="noreferrer">
                    {f.filename}
                  </a>
                  <button onClick={() => handleDelete(f.filename)}>
                    Delete
                  </button>
                </div>
                <video
                  src={url}
                  controls
                  width="480"
                  style={{ display: "block", marginTop: 6 }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
