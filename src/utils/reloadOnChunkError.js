// 배포 직후 이전 버전 화면이 열려있던 브라우저는, 새 배포에서 파일명이 바뀐
// 지연 로딩(dynamic import) 조각을 못 찾아 에러가 난다. 이 경우 새로고침 한 번이면
// 최신 버전을 새로 받아와서 바로 해결되므로, 세션당 한 번만 자동으로 새로고침한다.
const RELOADED_KEY = "withon-reloaded-for-chunk-error";

export function isChunkLoadError(err) {
  const msg = String(err?.message || err || "");
  return /fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(
    msg
  );
}

export function reloadForFreshVersion() {
  if (sessionStorage.getItem(RELOADED_KEY)) {
    return false;
  }
  sessionStorage.setItem(RELOADED_KEY, "1");
  window.location.reload();
  return true;
}
