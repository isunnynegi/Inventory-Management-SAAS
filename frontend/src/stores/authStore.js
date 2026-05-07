import { create } from "zustand";
import { devtools } from "zustand/middleware";

export const useAuthStore = create(devtools((set, get) => ({
  user: null,
  organization: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: ({ user, organization, accessToken }) => {
    window.__accessToken = accessToken;
    set({ user, organization, isAuthenticated: true, isLoading: false }, false, "setAuth");
  },
  clearAuth: () => { window.__accessToken = null; set({ user: null, organization: null, isAuthenticated: false, isLoading: false }, false, "clearAuth"); },
  setLoading: v => set({ isLoading: v }),
  updateOrg: org => set(s => ({ organization: { ...s.organization, ...org } })),
  isAdmin: () => ["admin","superAdmin"].includes(get().user?.role),
}), { name: "AuthStore" }));
