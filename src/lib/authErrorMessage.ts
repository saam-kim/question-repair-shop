interface FirebaseAuthError {
  code?: string;
}

function errorCode(error: unknown) {
  return typeof error === 'object' && error !== null ? (error as FirebaseAuthError).code : undefined;
}

export function authErrorMessage(error: unknown) {
  if (typeof navigator !== 'undefined' && !navigator.onLine)
    return '인터넷 연결이 없습니다. Wi-Fi 연결을 확인한 뒤 다시 시도해주세요.';

  switch (errorCode(error)) {
    case 'auth/network-request-failed':
      return '기기 인증 서버에 연결하지 못했습니다. 학교 네트워크에서 Firebase 접속이 차단되었을 수 있으니 교사에게 알려주세요.';
    case 'auth/too-many-requests':
      return '잠시 접속 요청이 많습니다. 잠시 뒤 다시 시도해주세요.';
    default:
      return '기기 인증에 실패했습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요.';
  }
}
