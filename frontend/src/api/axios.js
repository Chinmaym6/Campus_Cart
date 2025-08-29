import axios from "axios";

// CRA uses REACT_APP_*
// Provide a safe fallback to http://localhost:4000
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";

const instance = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: false
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("cc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default instance;
