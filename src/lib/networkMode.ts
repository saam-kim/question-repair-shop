const MODE_PARAM = 'connection';
const SCHOOL_MODE = 'school';

export function isSchoolNetworkMode() {
  return new URLSearchParams(window.location.search).get(MODE_PARAM) === SCHOOL_MODE;
}

export function alternateNetworkModeUrl() {
  const url = new URL(window.location.href);
  if (isSchoolNetworkMode()) url.searchParams.delete(MODE_PARAM);
  else url.searchParams.set(MODE_PARAM, SCHOOL_MODE);
  return url.toString();
}
