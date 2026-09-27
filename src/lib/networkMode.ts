const MODE_PARAM = 'connection';
const SCHOOL_MODE = 'school';
const DEFAULT_MODE = 'default';

export function isSchoolNetworkMode() {
  const selected = new URLSearchParams(window.location.search).get(MODE_PARAM);
  if (selected === SCHOOL_MODE) return true;
  if (selected === DEFAULT_MODE) return false;
  return true;
}

export function alternateNetworkModeUrl() {
  const url = new URL(window.location.href);
  if (isSchoolNetworkMode()) {
    url.searchParams.set(MODE_PARAM, DEFAULT_MODE);
  }
  else url.searchParams.set(MODE_PARAM, SCHOOL_MODE);
  return url.toString();
}
