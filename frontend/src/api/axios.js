import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export const api = axios.create({ baseURL: BASE, withCredentials: true, headers: { "Content-Type": "application/json" }, timeout: 15000 });

api.interceptors.request.use(cfg => {
  // Restore token from sessionStorage on page refresh (window.__accessToken is lost)
  if (!window.__accessToken) {
    const saved = sessionStorage.getItem("_sk_at");
    if (saved) window.__accessToken = saved;
  }
  const token = window.__accessToken;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
}, err => Promise.reject(err));

let refreshing = false, queue = [];
const flush = (err, token) => { queue.forEach(p => err ? p.reject(err) : p.resolve(token)); queue = []; };

api.interceptors.response.use(r => r, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry) {
    if (refreshing) return new Promise((res, rej) => queue.push({ resolve: res, reject: rej }))
      .then(t => { orig.headers.Authorization = `Bearer ${t}`; return api(orig); });
    orig._retry = true; refreshing = true;
    try {
      const { data } = await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true });
      const t = data.data.accessToken;
      window.__accessToken = t;
      sessionStorage.setItem("_sk_at", t);
      flush(null, t);
      orig.headers.Authorization = `Bearer ${t}`;
      return api(orig);
    } catch (e) { flush(e, null); window.__accessToken = null; sessionStorage.removeItem("_sk_at"); window.dispatchEvent(new Event("auth:logout")); return Promise.reject(e); }
    finally { refreshing = false; }
  }
  return Promise.reject(err);
});

export default api;
