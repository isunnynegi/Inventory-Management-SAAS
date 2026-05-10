import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const SF_TOKEN_KEY = "_sf_at";

// Separate axios instance for storefront — uses customer tokens, not staff tokens
export const sfApi = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

sfApi.interceptors.request.use(cfg => {
  // Restore token from sessionStorage on page refresh (window.__sfAccessToken is lost)
  if (!window.__sfAccessToken) {
    const saved = sessionStorage.getItem(SF_TOKEN_KEY);
    if (saved) window.__sfAccessToken = saved;
  }
  const token = window.__sfAccessToken;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
}, err => Promise.reject(err));

let refreshing = false, queue = [];
const flush = (err, token) => { queue.forEach(p => err ? p.reject(err) : p.resolve(token)); queue = []; };

sfApi.interceptors.response.use(r => r, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry && orig._slug) {
    if (refreshing) return new Promise((res, rej) => queue.push({ resolve: res, reject: rej }))
      .then(t => { orig.headers.Authorization = `Bearer ${t}`; return sfApi(orig); });
    orig._retry = true; refreshing = true;
    try {
      const { data } = await axios.post(`${BASE}/store/${orig._slug}/auth/refresh`, {}, { withCredentials: true });
      const t = data.data.accessToken;
      window.__sfAccessToken = t;
      sessionStorage.setItem(SF_TOKEN_KEY, t);
      flush(null, t);
      orig.headers.Authorization = `Bearer ${t}`;
      return sfApi(orig);
    } catch (e) {
      flush(e, null);
      window.__sfAccessToken = null;
      sessionStorage.removeItem(SF_TOKEN_KEY);
      window.dispatchEvent(new CustomEvent("sf:logout", { detail: { slug: orig._slug } }));
      return Promise.reject(e);
    } finally { refreshing = false; }
  }
  return Promise.reject(err);
});

const r = (res) => res.data;

export const storeApi = (slug) => {
  const withSlug = (cfg) => ({ ...cfg, _slug: slug });
  return {
    getInfo:        ()      => sfApi.get(`/store/${slug}/`, withSlug({})).then(r),
    getHomepage:    ()      => sfApi.get(`/store/${slug}/homepage`, withSlug({})).then(r),
    listProducts:   (p)     => sfApi.get(`/store/${slug}/products`, { params: p, ...withSlug({}) }).then(r),
    getProduct:     (id)    => sfApi.get(`/store/${slug}/products/${id}`, withSlug({})).then(r),
    listCategories: ()      => sfApi.get(`/store/${slug}/categories`, withSlug({})).then(r),
    filterOptions:  ()      => sfApi.get(`/store/${slug}/filter-options`, withSlug({})).then(r),
    validateCoupon: (code, subtotal) => sfApi.get(`/store/${slug}/coupons/validate`, { params: { code, subtotal }, ...withSlug({}) }).then(r),
    register:       (d)     => sfApi.post(`/store/${slug}/auth/register`, d, withSlug({})).then(r),
    login:          (d)     => sfApi.post(`/store/${slug}/auth/login`, d, withSlug({})).then(r),
    logout:         ()      => sfApi.post(`/store/${slug}/auth/logout`, {}, withSlug({})).then(r),
    getMe:          ()      => sfApi.get(`/store/${slug}/auth/me`, withSlug({})).then(r),
    updateMe:       (d)     => sfApi.patch(`/store/${slug}/auth/me`, d, withSlug({})).then(r),
    addAddress:     (d)     => sfApi.post(`/store/${slug}/auth/me/addresses`, d, withSlug({})).then(r),
    setDefaultAddress: (id) => sfApi.patch(`/store/${slug}/auth/me/addresses/${id}/primary`, {}, withSlug({})).then(r),
    removeAddress:  (id)    => sfApi.delete(`/store/${slug}/auth/me/addresses/${id}`, withSlug({})).then(r),
    getCart:           ()   => sfApi.get(`/store/${slug}/auth/me/cart`, withSlug({})).then(r),
    syncCart:          (items) => sfApi.put(`/store/${slug}/auth/me/cart`, { items }, withSlug({})).then(r),
    createOrder:       (d)  => sfApi.post(`/store/${slug}/orders`, d, withSlug({})).then(r),
    listOrders:        (p)  => sfApi.get(`/store/${slug}/orders`, { params: p, ...withSlug({}) }).then(r),
    getOrder:          (id) => sfApi.get(`/store/${slug}/orders/${id}`, withSlug({})).then(r),
    getOrderInvoicePdf:(id) => sfApi.get(`/store/${slug}/orders/${id}/invoice/pdf`, { responseType: "blob", ...withSlug({}) }),
    initiateJuspay:    (d)  => sfApi.post(`/store/${slug}/payment/juspay/initiate`, d, withSlug({})).then(r),
    submitUtr:         (d)  => sfApi.post(`/store/${slug}/payment/utr`, d, withSlug({})).then(r),
  };
};
