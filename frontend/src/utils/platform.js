export const isElectron = () =>
  typeof navigator !== "undefined" && navigator.userAgent.includes("Electron");
