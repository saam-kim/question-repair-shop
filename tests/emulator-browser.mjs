import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { chromium, webkit } from 'playwright';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const projectId = 'demo-question-repair';
const env = await initializeTestEnvironment({
  projectId,
  firestore: { host: '127.0.0.1', port: 8080, rules: await readFile('firestore.rules', 'utf8') },
});
await env.clearFirestore();
const server = await createServer({
  configFile: false, cacheDir: `node_modules/.cache/qrs-test-emulator-browser-${process.pid}`,
  root: fileURLToPath(new URL('..', import.meta.url)),
  server: { host: '127.0.0.1', port: 0 },
  plugins: [react(), tailwindcss()],
  define: Object.fromEntries(
    Object.entries({
      VITE_FIREBASE_API_KEY: 'demo-api-key',
      VITE_FIREBASE_PROJECT_ID: projectId,
      VITE_FIREBASE_AUTH_DOMAIN: projectId + '.firebaseapp.com',
      VITE_FIREBASE_APP_ID: 'demo-app',
      VITE_USE_EMULATORS: 'true',
    }).map(([key, value]) => ['import.meta.env.' + key, JSON.stringify(value)]),
  ),
});
let browser;
const errors = [];
try {
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const browserType = process.env.PLAYWRIGHT_BROWSER === 'webkit' ? webkit : chromium;
  browser = await browserType.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  async function client() {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      acceptDownloads: true,
    });
    await context.route('**/*', (route) =>
      ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', (error) => errors.push(error.message));
    return page;
  }
  const teacher = await client();
  await teacher.goto(base);
  await teacher.getByRole('button', { name: '새로운 수업 만들기' }).click();
  await teacher.waitForURL(/#\/teacher\/s\d{6}/);
  const sid = teacher.url().split('/').at(-1);
  const code = sid.slice(1);
  await teacher.getByRole('dialog').waitFor();
  await teacher.keyboard.press('Escape');
  const student = await client(),
    second = await client();
  await Promise.all([
    student.goto(base + '#/student/' + sid),
    second.goto(base + '#/student/' + sid),
  ]);
  await Promise.all([
    student.getByText('곧 활동이 시작됩니다').waitFor(),
    second.getByText('곧 활동이 시작됩니다').waitFor(),
  ]);
  async function snapshot(sessionId = sid) {
    return teacher.evaluate(async (sid) => {
      const api = await import('/tests/fixtures/emulator-access.ts');
      return api.snapshot(sid);
    }, sessionId);
  }
  const before = await snapshot();
  assert.equal(Object.keys(before.teams).length, 2);
  const duplicate = await student.context().newPage();
  await duplicate.goto(base + '#/student/' + sid);
  await duplicate.getByText('곧 활동이 시작됩니다').waitFor();
  await duplicate.close();
  await student.reload();
  await student.getByText('곧 활동이 시작됩니다').waitFor();
  assert.deepEqual(await snapshot(), before);
  console.log(
    'PASS: real anonymous authentication, QR joins, refreshed identity and duplicate tab',
  );

  await teacher.locator('#class-guide summary').click();
  await teacher.getByRole('button', { name: '수업 미리 연습하기', exact: true }).click();
  await teacher.getByText('연습용 공간입니다.', { exact: false }).waitFor();
  // Both dashboard and overlay have the same phase action; choose the visible overlay's last button.
  await teacher.getByRole('button', { name: '질문 만들기 시작', exact: true }).last().click();
  await teacher.getByRole('button', { name: '예시로 자동 채우기', exact: true }).click();
  await teacher.getByRole('button', { name: '응답 배정하고 시작하기', exact: true }).click();
  await teacher.getByRole('button', { name: '예시로 자동 채우기', exact: true }).click();
  await teacher.getByRole('button', { name: '피드백 확인 단계로', exact: true }).click();
  await teacher.getByRole('button', { name: '질문 수리 시작', exact: true }).click();
  await teacher.getByRole('button', { name: '예시로 자동 채우기', exact: true }).click();
  await teacher.getByRole('button', { name: '전체 결과 보기', exact: true }).click();
  await teacher.getByText('질문 수리 완료!', { exact: true }).first().waitFor();
  await teacher.getByRole('button', { name: '리허설 처음부터', exact: true }).first().click();
  await teacher.getByRole('button', { name: '질문 만들기 시작', exact: true }).last().waitFor();
  await teacher.getByRole('button', { name: '닫기', exact: true }).click();
  assert.deepEqual(await snapshot(), before);
  console.log('PASS: full rehearsal and reset leave Firestore classroom unchanged');

  await teacher.getByRole('button', { name: '질문 만들기 시작', exact: true }).click();
  await teacher.getByRole('button', { name: '일시정지', exact: true }).click();
  await Promise.all([student, second].map((page) =>
    page.getByText('잠시, 선생님에게 집중해주세요', { exact: true }).waitFor(),
  ));
  assert.equal((await snapshot()).session.status, 'PAUSED');
  await teacher.getByRole('button', { name: '활동 재개', exact: true }).click();
  await Promise.all([student, second].map((page) =>
    page.getByText('잠시, 선생님에게 집중해주세요', { exact: true }).waitFor({ state: 'hidden' }),
  ));
  console.log('PASS: teacher pause/resume propagates to both students');
  for (const page of [student, second]) {
    await page.getByRole('textbox').fill('스마트폰 사용');
    await page.getByRole('button', { name: '다음 단계로', exact: true }).click();
    await page.locator('textarea').nth(0).fill('부모님이 스마트폰 사용을 통제하나요?');
    await page.locator('textarea').nth(1).fill('스마트폰 사용에 얼마나 만족하나요?');
    await page.locator('textarea').nth(2).fill('하루 스마트폰 사용 시간은?');
    await page.getByRole('button', { name: '예/아니요', exact: true }).nth(0).click();
    await page.getByRole('button', { name: '단답형 주관식', exact: true }).nth(2).click();
    await page.getByRole('button', { name: '제출 전 확인하기', exact: true }).click();
    await page.getByRole('button', { name: '우리 조 질문지 제출하기', exact: true }).click();
    await page.getByText('질문지를 제출했습니다', { exact: true }).waitFor();
  }
  await teacher.getByRole('button', { name: '응답 배정하고 시작하기', exact: true }).click();
  await student.getByRole('button', { name: '아니요', exact: true }).click();
  await student.getByRole('button', { name: '다음', exact: true }).click();
  await student.locator('textarea').fill('새로고침 후에도 유지되는 피드백');
  await student.reload();
  await student.getByText('방금 응답:', { exact: false }).waitFor();
  assert.equal(await student.locator('textarea').inputValue(), '새로고침 후에도 유지되는 피드백');
  await student.getByRole('button', { name: '다음 질문 →', exact: true }).click();
  await student.getByRole('button', { name: '4 그렇다', exact: true }).waitFor();
  await student.reload();
  await student.getByRole('button', { name: '4 그렇다', exact: true }).waitFor();
  assert.equal(await student.getByRole('button', { name: '아니요', exact: true }).count(), 0);
  await student.getByRole('button', { name: '4 그렇다', exact: true }).click();
  await student.getByRole('button', { name: '다음', exact: true }).click();
  await student.getByRole('button', { name: '다음 질문 →', exact: true }).click();
  await student.locator('input').fill('2');
  await student.getByRole('button', { name: '다음', exact: true }).click();
  await student.getByRole('button', { name: '응답 완료', exact: true }).click();
  await student.getByText('배정된 1개 조의 질문에 모두 응답했습니다', { exact: true }).waitFor();
  for (const [label, value] of [['아니요'], ['4 그렇다'], [null, '3']]) {
    if (label) await second.getByRole('button', { name: label, exact: true }).click();
    else await second.locator('input').fill(value);
    await second.getByRole('button', { name: '다음', exact: true }).click();
    await second
      .getByRole('button', { name: label === null ? '응답 완료' : '다음 질문 →', exact: true })
      .click();
  }
  await second.getByText('배정된 1개 조의 질문에 모두 응답했습니다', { exact: true }).waitFor();
  console.log(
    'PASS: real submissions, yes/no + scale + short answer, unsent draft and server progress recovery',
  );
  await teacher.getByRole('button', { name: '피드백 확인 단계로', exact: true }).click();
  await teacher.getByRole('button', { name: '질문 수리 시작', exact: true }).click();
  for (const page of [student, second]) {
    await page.getByRole('button', { name: /수리.*제출/ }).click();
    await page.getByText('질문 수리를 완료했습니다', { exact: true }).waitFor();
  }
  await teacher.getByRole('button', { name: '전체 결과 보기', exact: true }).click();
  await student.getByText('질문 수리 완료!', { exact: true }).waitFor();
  const complete = await snapshot();
  assert.equal(complete.session.currentPhase, 'RESULT');
  assert(Object.values(complete.teams).every((t) => t.revisionsSubmittedAt));
  const downloadPromise = teacher.waitForEvent('download');
  await teacher.getByRole('button', { name: '결과 내려받기', exact: true }).click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), 'utf8');
  assert(csv.includes('새로고침 후에도 유지되는 피드백') && csv.includes('예/아니요'));
  if (process.env.SCREENSHOTS) {
    await mkdir('.dorms-check/private/design', { recursive: true });
    await teacher.screenshot({
      path: '.dorms-check/private/design/verified-results.png',
      fullPage: true,
    });
  }
  teacher.once('dialog', (d) => d.accept());
  await teacher.getByRole('button', { name: '수업 종료', exact: true }).click();
  await teacher.getByRole('button', { name: '수업 기록 삭제', exact: true }).waitFor();
  await teacher.goto(base);
  await teacher.getByRole('button', { name: '새로운 수업 만들기', exact: true }).click();
  await teacher.waitForURL(/#\/teacher\/s\d{6}/);
  const freshId = teacher.url().split('/').at(-1);
  assert.notEqual(freshId, sid);
  await teacher.getByRole('dialog').waitFor();
  await teacher.keyboard.press('Escape');
  await teacher.getByRole('heading', { name: '학생들을 초대해주세요' }).waitFor();
  assert.equal(await teacher.getByRole('button', { name: '질문 만들기 시작', exact: true }).isDisabled(), true);
  await teacher.reload();
  await teacher.getByRole('heading', { name: '학생들을 초대해주세요' }).waitFor();
  const fresh = await snapshot(freshId);
  assert.equal(fresh.session.status, 'LOBBY');
  assert.deepEqual(fresh.teams, {});
  assert.equal((await snapshot()).session.status, 'ENDED');
  assert.equal(Object.keys((await snapshot()).teams).length, 2);
  console.log('PASS: ended class stays archived; new code and empty class survive reload');
  await teacher.goto(base);
  await teacher
    .getByRole('region', { name: '내 수업 기록' })
    .getByRole('link')
    .filter({ hasText: code })
    .click();
  teacher.once('dialog', (d) => d.accept());
  await teacher.getByRole('button', { name: '수업 기록 삭제', exact: true }).click();
  await teacher.waitForURL((url) => !url.hash.includes(sid));
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    assert.equal((await db.doc('qrsSessions/' + sid).get()).exists, false);
    assert.equal((await db.collection('qrsSessions/' + sid + '/teams').get()).size, 0);
  });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: revision, results export, ended class history, permanent deletion; no browser errors',
  );
} finally {
  await browser?.close();
  await server.close();
  await env.cleanup();
}
