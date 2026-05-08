import { create } from "zustand";

function getInitialTheme() {
  const stored = localStorage.getItem("sk-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const initial = getInitialTheme();
document.documentElement.classList.toggle("dark", initial === "dark");

export const useThemeStore = create((set, get) => {
  // When user hasn't set a manual preference, follow OS changes in real time
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    if (!localStorage.getItem("sk-theme")) {
      const next = e.matches ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      set({ theme: next });
    }
  });

  return {
    theme: initial,
    toggle: () => set(state => {
      const next = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("sk-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return { theme: next };
    }),
  };
});
