import { create } from "zustand";
import { devtools } from "zustand/middleware";

export const useAuthStore = create(devtools((set, get) => ({
  user: null,
  organization: null,
  isAuthenticated: false,
  isLoading: true,
  impersonating: false,
  impersonatedOrgName: null,
  setAuth: ({ user, organization, accessToken }) => {
    window.__accessToken = accessToken;
    set({ user, organization, isAuthenticated: true, isLoading: false }, false, "setAuth");
  },
  clearAuth: () => {
    window.__accessToken = null;
    window.__originalToken = null;
    set({ user: null, organization: null, isAuthenticated: false, isLoading: false, impersonating: false, impersonatedOrgName: null }, false, "clearAuth");
  },
  setLoading: v => set({ isLoading: v }),
  updateOrg: org => set(s => ({ organization: { ...s.organization, ...org } })),
  isAdmin: () => ["admin","superAdmin"].includes(get().user?.role),
  isSuperAdmin: () => get().user?.role === "superAdmin",
  startImpersonation: (token, orgName) => {
    window.__originalToken = window.__accessToken;
    window.__accessToken = token;
    set({ impersonating: true, impersonatedOrgName: orgName }, false, "startImpersonation");
  },
  stopImpersonation: () => {
    window.__accessToken = window.__originalToken;
    window.__originalToken = null;
    set({ impersonating: false, impersonatedOrgName: null }, false, "stopImpersonation");
  },
}), { name: "AuthStore" }));
