import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const SHOP_TOKEN_KEY = "_shop_at";

export const shopApiClient = axios.create({
  baseURL: `${BASE}/shop`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

shopApiClient.interceptors.request.use(cfg => {
  if (!window.__shopAccessToken) {
    const saved = localStorage.getItem(SHOP_TOKEN_KEY);
    if (saved) window.__shopAccessToken = saved;
  }
  const token = window.__shopAccessToken;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
}, err => Promise.reject(err));

let refreshing = false, queue = [];
const flush = (err, token) => { queue.forEach(p => err ? p.reject(err) : p.resolve(token)); queue = []; };

shopApiClient.interceptors.response.use(r => r, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry) {
    if (refreshing) return new Promise((res, rej) => queue.push({ resolve: res, reject: rej }))
      .then(t => { orig.headers.Authorization = `Bearer ${t}`; return shopApiClient(orig); });
    orig._retry = true; refreshing = true;
    try {
      const { data } = await axios.post(`${BASE}/shop/auth/refresh`, {}, { withCredentials: true });
      const t = data.data.accessToken;
      window.__shopAccessToken = t;
      localStorage.setItem(SHOP_TOKEN_KEY, t);
      flush(null, t);
      orig.headers.Authorization = `Bearer ${t}`;
      return shopApiClient(orig);
    } catch (e) {
      flush(e, null);
      window.__shopAccessToken = null;
      localStorage.removeItem(SHOP_TOKEN_KEY);
      window.dispatchEvent(new CustomEvent("shop:logout"));
      return Promise.reject(e);
    } finally { refreshing = false; }
  }
  return Promise.reject(err);
});

const r = res => res.data;

export const shopApi = {
  // Auth
  register:    d  => shopApiClient.post("/auth/register", d).then(r),
  login:       d  => shopApiClient.post("/auth/login", d).then(r),
  logout:      () => shopApiClient.post("/auth/logout", {}).then(r),
  refresh:     () => shopApiClient.post("/auth/refresh", {}).then(r),
  getMe:       () => shopApiClient.get("/auth/me").then(r),
  updateMe:    d  => shopApiClient.patch("/auth/me", d).then(r),
  addAddress:         d  => shopApiClient.post("/auth/me/addresses", d).then(r),
  setDefaultAddress:  id => shopApiClient.patch(`/auth/me/addresses/${id}/primary`, {}).then(r),
  removeAddress:      id => shopApiClient.delete(`/auth/me/addresses/${id}`).then(r),

  // Marketplace
  listStores:  ()  => shopApiClient.get("/stores").then(r),

  // Cross-store orders
  listOrders:  (p) => shopApiClient.get("/orders", { params: p }).then(r),
};

export function setShopToken(token) {
  window.__shopAccessToken = token;
  if (token) localStorage.setItem(SHOP_TOKEN_KEY, token);
  else localStorage.removeItem(SHOP_TOKEN_KEY);
}

export function getShopToken() {
  if (!window.__shopAccessToken) {
    const saved = localStorage.getItem(SHOP_TOKEN_KEY);
    if (saved) window.__shopAccessToken = saved;
  }
  return window.__shopAccessToken || null;
}
