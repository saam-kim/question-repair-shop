# 질문수리소

사회와 문화의 질문지법을 실습하는 교실용 웹앱입니다. 조별로 질문 3개를 만들고 다른 조의 응답·피드백을 받아 질문을 수정합니다.

## 개발

```sh
npm ci
npm run dev
```

`.env.example`을 `.env.local`로 복사하고 Firebase 웹 앱 설정을 입력합니다. Firebase Authentication의 익명 로그인을 활성화해야 합니다. 프런트엔드와 함께 `firestore.rules`를 적용해야 권한 제어가 작동합니다.

React · TypeScript · Vite · Tailwind CSS · Firebase Auth/Firestore를 사용하며 Vercel에 배포합니다.

## 검증

```sh
npm test
npm run build
npm run lint
npm run test:emulators
```

브라우저 테스트에는 Playwright Chromium 또는 `PLAYWRIGHT_CHANNEL=chrome`으로 지정한 설치된 Chrome이 필요합니다. 에뮬레이터 테스트에는 Java 21 이상이 필요하며 운영 데이터에 연결하지 않습니다.

## 수업 운영

2~40개 조, 조별 기기 한 대를 사용합니다. 교사는 수업을 만든 브라우저에서 이어서 진행하며 리허설은 별도의 임시 공간에서 작동합니다. 리허설에서는 학생 화면과 교사 대시보드를 전환할 수 있습니다. 수업 기록은 HTML·CSV로 내려받고 종료 후 삭제할 수 있습니다.

교사 통계는 문항별 응답 조의 30% 이상이 지적한 유형만 집계합니다. 유형과 문항을 눌러 실제 질문 및 수리 전후를 확인할 수 있으며, 오류 여부의 최종 판단은 교사가 합니다.

TypeScript의 엄격한 타입 검사를 사용합니다. Firebase·React 라이브러리는 별도 빌드 파일로 분리하고, 결과 다운로드 코드는 사용할 때 불러옵니다. 임시 저장과 수업 데이터 갱신을 수정할 때에는 `tests/cleanup.mjs`의 복원·불변성 검사도 통과해야 합니다.

[수업 준비 점검·검증 결과·기존 수업 처리 및 배포 절차](docs/classroom-readiness.md)를 참고하세요. 기존 수업을 새 보안 규칙 아래에서 그대로 재사용하는 업데이트가 아니므로 수업 중 단독 규칙 배포를 피하고 새 수업으로 시작해야 합니다.
