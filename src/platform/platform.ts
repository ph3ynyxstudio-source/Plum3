export function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/u.test(navigator.userAgent);
}

export function applyPlatformMarker(android = isAndroid()): boolean {
  document.documentElement.dataset.platform = android ? "android" : "desktop";
  return android;
}
