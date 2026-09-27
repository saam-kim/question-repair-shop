const MODE_PARAM = 'connection';
const SCHOOL_MODE = 'school';
const DEFAULT_MODE = 'default';

function isWebKitBrowser() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) ||
    (/AppleWebKit/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|SamsungBrowser/.test(ua));
}

export function isSchoolNetworkMode() {
  const selected = new URLSearchParams(window.location.search).get(MODE_PARAM);
  if (selected === SCHOOL_MODE) return true;
  if (selected === DEFAULT_MODE) return false;
  return isWebKitBrowser();
}

export function alternateNetworkModeUrl() {
  const url = new URL(window.location.href);
  if (isSchoolNetworkMode()) {
    if (isWebKitBrowser()) url.searchParams.set(MODE_PARAM, DEFAULT_MODE);
    else url.searchParams.delete(MODE_PARAM);
  }
  else url.searchParams.set(MODE_PARAM, SCHOOL_MODE);
  return url.toString();
}
