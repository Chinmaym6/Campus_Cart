import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:4000",
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("cc_token");
      // window.location.href = "/login"; // optional
    }
    return Promise.reject(err);
  }
);

export default api;
