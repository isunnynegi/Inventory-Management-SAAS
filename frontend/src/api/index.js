import api from "./axios.js";
const r = (res) => res.data;
export const authApi = {
  register: d => api.post("/auth/register", d).then(r),
  login: d => api.post("/auth/login", d).then(r),
  logout: d => api.post("/auth/logout", d).then(r),
  refresh: () => api.post("/auth/refresh").then(r),
  getMe: () => api.get("/auth/me").then(r),
  changePassword: d => api.patch("/auth/change-password", d).then(r),
  forgotPassword: d => api.post("/auth/forgot-password", d).then(r),
  resetPassword: d => api.post("/auth/reset-password", d).then(r),
};
export const orgApi = {
  get: () => api.get("/organizations/me").then(r),
  update: d => api.patch("/organizations/me", d).then(r),
};
export const categoryApi = {
  list: p => api.get("/categories", { params: p }).then(r),
  create: d => api.post("/categories", d).then(r),
  update: (id, d) => api.put(`/categories/${id}`, d).then(r),
  delete: id => api.delete(`/categories/${id}`).then(r),
};
export const productApi = {
  list: p => api.get("/products", { params: p }).then(r),
  create: d => api.post("/products", d).then(r),
  get: id => api.get(`/products/${id}`).then(r),
  update: (id, d) => api.put(`/products/${id}`, d).then(r),
  delete: id => api.delete(`/products/${id}`).then(r),
  lowStock: () => api.get("/products/low-stock").then(r),
};
export const supplierApi = {
  list: p => api.get("/suppliers", { params: p }).then(r),
  create: d => api.post("/suppliers", d).then(r),
  get: id => api.get(`/suppliers/${id}`).then(r),
  update: (id, d) => api.put(`/suppliers/${id}`, d).then(r),
  delete: id => api.delete(`/suppliers/${id}`).then(r),
};
export const customerApi = {
  list: p => api.get("/customers", { params: p }).then(r),
  create: d => api.post("/customers", d).then(r),
  get: id => api.get(`/customers/${id}`).then(r),
  update: (id, d) => api.put(`/customers/${id}`, d).then(r),
  delete: id => api.delete(`/customers/${id}`).then(r),
};
export const purchaseApi = {
  list: p => api.get("/purchases", { params: p }).then(r),
  create: d => api.post("/purchases", d).then(r),
  get: id => api.get(`/purchases/${id}`).then(r),
  delete: id => api.delete(`/purchases/${id}`).then(r),
};
export const saleApi = {
  list: p => api.get("/sales", { params: p }).then(r),
  create: d => api.post("/sales", d).then(r),
  get: id => api.get(`/sales/${id}`).then(r),
  delete: id => api.delete(`/sales/${id}`).then(r),
};
export const stockAdjApi = {
  list: p => api.get("/stock-adjustments", { params: p }).then(r),
  create: d => api.post("/stock-adjustments", d).then(r),
};
export const invoiceApi = {
  list: p => api.get("/invoices", { params: p }).then(r),
  fromSale: id => api.post(`/invoices/from-sale/${id}`).then(r),
  create: d => api.post("/invoices", d).then(r),
  get: id => api.get(`/invoices/${id}`).then(r),
  updateStatus: (id, d) => api.patch(`/invoices/${id}/status`, d).then(r),
  downloadPDF: id => api.get(`/invoices/${id}/pdf`, { responseType: "blob" }),
};
export const dashboardApi = {
  stats: () => api.get("/dashboard/stats").then(r),
};
export const reportApi = {
  sales: p => api.get("/reports/sales", { params: p }).then(r),
  purchases: p => api.get("/reports/purchases", { params: p }).then(r),
  stock: p => api.get("/reports/stock", { params: p }).then(r),
  profit: p => api.get("/reports/profit", { params: p }).then(r),
};
export const userApi = {
  list: p => api.get("/users", { params: p }).then(r),
  invite: d => api.post("/users/invite", d).then(r),
  updateRole: (id, d) => api.patch(`/users/${id}/role`, d).then(r),
  toggle: id => api.patch(`/users/${id}/toggle`).then(r),
  remove: id => api.delete(`/users/${id}`).then(r),
};
