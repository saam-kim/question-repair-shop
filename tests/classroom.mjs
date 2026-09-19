import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { chromium } from 'playwright';

const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const server = await createServer({
  configFile: false, cacheDir: 'node_modules/.cache/qrs-test-classroom',
  root: fileURLToPath(new URL('..', import.meta.url)),
  server: { host: '127.0.0.1', port: 0 },
  resolve: {
    alias: [
      { find: /^(?:\.\/firestoreDb|.*firebase\/firestoreDb)$/, replacement: fixture('classroom-db.ts') },
      { find: /^firebase\/firestore$/, replacement: fixture('classroom-db.ts') },
      { find: /.*hooks\/use(?:AnonAuth|Session)$/, replacement: fixture('classroom-state.ts') },
    ],
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'classroom-fixture',
      configureServer(vite) {
        vite.middlewares.use('/__classroom', async (_req, res) => {
          res.setHeader('Content-Type', 'text/html');
          res.end(
            await vite.transformIndexHtml(
              '/__classroom',
              '<html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/classroom.tsx"></script></body></html>',
            ),
          );
        });
      },
    },
  ],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.error(e.message);
  });
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__classroom`);
  const button = (name) => page.getByRole('button', { name, exact: true });
  const snapshot = async (name) => {
    if (!process.env.SCREENSHOTS) return;
    await mkdir('.dorms-check/private/design', { recursive: true });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `.dorms-check/private/design/${name}.png`, fullPage: true });
  };
  const noOverflow = async () =>
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
  await page.getByRole('heading', { name: '좋은 질문은, 함께 고쳐집니다.' }).waitFor();
  const seedTeams = await page.evaluate(() => window.classroom.data.teams);
  await snapshot('home-desktop');
  await button('수업 운영 가이드').click();
  assert.equal(await page.locator('details').getAttribute('open'), '');
  assert.equal(new URL(page.url()).hash, '');
  // Preview rehearsals use the real in-memory store and database routing.
  // Reset must clear both submitted data and unsaved input, without touching the class.
  const classroomBefore = await page.evaluate(() => JSON.stringify(window.classroom.data));
  const callsBefore = await page.evaluate(() => window.classroom.calls.length);
  await button('수업 미리 연습하기').click();
  await page.getByRole('heading', { name: '곧 활동이 시작됩니다', exact: true }).waitFor();
  await button('질문 만들기 시작').click();
  await page.getByLabel('조사 주제').filter({ visible: true }).fill('초기화할 입력');
  await button('리허설 처음부터').filter({ visible: true }).click();
  await page.getByRole('heading', { name: '곧 활동이 시작됩니다', exact: true }).waitFor();
  await button('질문 만들기 시작').click();
  assert.equal(await page.getByLabel('조사 주제').filter({ visible: true }).inputValue(), '');
  await button('예시로 자동 채우기').click();
  await page.getByRole('heading', { name: '질문지를 제출했습니다', exact: true }).waitFor();
  await button('3조 · 햇살').click();
  await button('리허설 처음부터').filter({ visible: true }).click();
  await page.getByRole('heading', { name: '곧 활동이 시작됩니다', exact: true }).waitFor();
  await button('질문 만들기 시작').click();
  assert.equal(await button('응답 배정하고 시작하기').isDisabled(), true);
  for (const name of ['1조 · 연두', '2조 · 바다', '3조 · 햇살', '4조 · 노을']) {
    await button(name).click();
    assert.equal(await page.getByLabel('조사 주제').filter({ visible: true }).inputValue(), '');
  }
  await button('닫기').click();
  assert.equal(await page.evaluate(() => JSON.stringify(window.classroom.data)), classroomBefore);
  assert.equal(await page.evaluate(() => window.classroom.calls.length), callsBefore);
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await snapshot('home-mobile');
  await page.getByRole('link', { name: '학생 입장' }).click();
  await page.getByLabel('수업 코드').fill('12a3456');
  assert.equal(await page.getByLabel('수업 코드').inputValue(), '123456');
  await snapshot('student-join');
  await page.getByRole('link', { name: '교사 화면으로' }).click();
  await button('새로운 수업 만들기').click();
  await page.getByRole('dialog').waitFor();
  await snapshot('student-qr');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.equal(await button('질문 만들기 시작').isDisabled(), true);
  const firstCreatedId = await page.evaluate(() => window.classroom.sessionId);
  assert.notEqual(firstCreatedId, 's123456');
  assert.deepEqual(await page.evaluate(() => window.classroom.data.teams), {});
  await noOverflow();
  await page.evaluate(() => {
    const base = { ownerUid: 's', createdAt: 1 };
    window.classroom.setTeams({
      team1: { ...base, teamNumber: 1, nickname: '연두' },
      team2: { ...base, teamNumber: 2, nickname: '여울' },
    });
  });
  await button('질문 만들기 시작').click();
  await page.getByRole('heading', { name: '우리 반의 질문이 만들어지고 있어요' }).waitFor();
  await page.evaluate((teams) => window.classroom.setTeams(teams), seedTeams);
  await snapshot('dashboard-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await snapshot('dashboard-desktop');
  await page.evaluate(() => {
    window.classroom.failNext = true;
  });
  await button('일시정지').click();
  await page.getByRole('alert').waitFor();
  await button('일시정지').click();
  await button('활동 재개').waitFor();
  assert.equal(await button('응답 배정하고 시작하기').isDisabled(), true);
  await button('활동 재개').click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await button('수업 종료').click();
  assert.equal(
    await page.evaluate(() => window.classroom.calls.some((c) => c.name === 'end')),
    false,
  );
  // End a populated class, then create another through the actual home UI.
  page.once('dialog', (dialog) => dialog.accept());
  await button('수업 종료').click();
  await page.getByRole('heading', { name: '함께 만든 질문, 수고했어요' }).waitFor();
  await page.getByRole('link', { name: '질문수리소 처음으로' }).click();
  await button('새로운 수업 만들기').click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: '학생들을 초대해주세요' }).waitFor();
  const nextCreatedId = await page.evaluate(() => window.classroom.sessionId);
  assert.notEqual(nextCreatedId, firstCreatedId);
  assert.deepEqual(await page.evaluate(() => window.classroom.data.teams), {});
  assert.deepEqual(await page.evaluate(() => window.classroom.data.assignments), {});
  assert.equal(await button('질문 만들기 시작').isDisabled(), true);
  await page.reload();
  await page.getByRole('heading', { name: '학생들을 초대해주세요' }).waitFor();
  assert.equal(await page.evaluate(() => window.classroom.sessionId), nextCreatedId);
  assert.deepEqual(await page.evaluate(() => window.classroom.data.teams), {});
  const endedClass = await page.evaluate((id) => window.classroom.getSession(id), firstCreatedId);
  assert.equal(endedClass.session.status, 'ENDED');
  assert.equal(Object.keys(endedClass.teams).length, 6);
  await page.evaluate(() => {
    window.classroom.setTeams({
      team1: { teamNumber: 1, nickname: '연두', ownerUid: 'student1', createdAt: 1 },
    });
    window.classroom.setUid('student1');
    window.classroom.patch({ status: 'ACTIVE', currentPhase: 'QUESTION' });
    location.hash = '/student/' + window.classroom.sessionId;
  });
  await page.getByRole('heading', { name: '무엇이 궁금한가요?' }).waitFor();
  assert.equal(
    await page.evaluate(() => window.classroom.calls.filter((c) => c.name === 'join').length),
    1,
  );
  await snapshot('topic-desktop');
  await page.getByLabel('조사 주제').fill('학교생활');
  await page.evaluate(() => {
    window.classroom.failNext = true;
  });
  await button('다음 단계로').click();
  await page.getByRole('alert').first().waitFor();
  assert.equal(await page.getByLabel('조사 주제').inputValue(), '학교생활');
  await page.evaluate(() => window.classroom.setError('offline'));
  await page.getByRole('button', { name: '다시 연결' }).waitFor();
  await page.evaluate((teams) => {
    window.classroom.setError(null);
    const team = { ...teams.team1 };
    delete team.questionsSubmittedAt;
    window.classroom.setTeams({ ...teams, team1: team });
  }, seedTeams);
  await page.getByRole('heading', { name: '질문 3개 만들기' }).waitFor();
  await page.locator('textarea').nth(0).fill('학교 급식의 양은 충분한가요?');
  await page.locator('textarea').nth(1).fill('학교생활에 얼마나 만족하나요?');
  await page.locator('textarea').nth(2).fill('우리 학교에서 바꾸고 싶은 점은 무엇인가요?');
  await button('예/아니요').nth(0).click();
  await button('서술형 주관식').nth(2).click();
  await snapshot('questions-desktop');
  await page.setViewportSize({ width: 768, height: 1024 });
  await noOverflow();
  await snapshot('questions-tablet');
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await snapshot('questions-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate((teams) => {
    teams.team2.feedbackGiven = {
      team1: {
        q1: {
          problemTypes: ['DOUBLE_BARRELED'],
          comment: '맛과 양을 한 번에 묻고 있어요.',
          createdAt: 1,
        },
        q2: {
          problemTypes: ['UNCLEAR', 'LEADING'],
          comment: '어느 기간의 학교생활인지 알려주면 좋겠어요.',
          createdAt: 1,
        },
      },
    };
    window.classroom.setTeams(teams);
    window.classroom.patch({ currentPhase: 'FEEDBACK_REVIEW' });
  }, seedTeams);
  await page.getByRole('heading', { name: '우리 조 질문 수리하기' }).waitFor();
  await snapshot('feedback-desktop');
  await page.evaluate(() => window.classroom.patch({ currentPhase: 'REVISION' }));
  await page.getByRole('heading', { name: '질문 수리하기' }).waitFor();
  await snapshot('revision-desktop');
  assert.deepEqual(errors, []);
  console.log(
    'PASS: home, guide, mobile layouts, joining, classroom controls, errors, pause, end confirmation, dialog keyboard access',
  );
} finally {
  await browser?.close();
  await server.close();
}
