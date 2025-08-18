import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

export default api;
