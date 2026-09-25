import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { chromium, webkit } from 'playwright';

// Exercise the actual screens, replacing only the database boundary.
// This server is local only and never connects to the production Firebase project.
const server = await createServer({
  configFile: false, cacheDir: 'node_modules/.cache/qrs-test-yes-no',
  root: fileURLToPath(new URL('..', import.meta.url)),
  server: { host: '127.0.0.1', port: 0 },
  resolve: { alias: [{ find: /.*firebase\/db$/, replacement: fileURLToPath(new URL('./fixtures/db.ts', import.meta.url)) }] },
  plugins: [react(), tailwindcss(), {
    name: 'yes-no-test-page',
    configureServer(vite) {
      vite.middlewares.use('/__test', async (_req, res) => {
        const html = await vite.transformIndexHtml('/__test', '<html><body><div id="root"></div><script type="module" src="/tests/fixtures/yes-no.tsx"></script></body></html>');
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
      });
    },
  }],
});

let browser;
try {
  await server.listen();
  const browserType = process.env.PLAYWRIGHT_BROWSER === 'webkit' ? webkit : chromium;
  browser = await browserType.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (error) => { errors.push(error.message); console.error(error.message); });
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__test`);
  const button = (name) => page.getByRole('button', { name, exact: true });
  const stage = async (name) => page.evaluate((value) => window.testApp.render(value), name);
  const calls = async (name) => page.evaluate((value) => window.testApp.calls.filter((call) => call.name === value), name);

  await page.locator('textarea').nth(0).fill('부모님이 스마트폰 사용을 통제하나요?');
  await page.locator('textarea').nth(1).fill('스마트폰 사용에 만족하나요?');
  await page.locator('textarea').nth(2).fill('하루 사용 시간은?');
  // Switching from an incomplete custom scale must not block a binary question.
  await button('척도 직접 수정').nth(0).click();
  await page.getByRole('textbox').nth(1).fill('');
  await page.getByRole('checkbox').nth(0).check();
  await button('예/아니요').nth(0).click();
  await button('단답형 주관식').nth(2).click();
  await page.reload();
  await page.waitForFunction(() => document.querySelector('textarea')?.value === '부모님이 스마트폰 사용을 통제하나요?');
  assert.equal(await button('예/아니요').nth(0).getAttribute('aria-pressed'), 'true');
  if (process.env.TEST_SCREENSHOT) await page.screenshot({ path: process.env.TEST_SCREENSHOT, fullPage: true });
  await button('제출 전 확인하기').click();
  assert.equal(await page.getByText('선택지: 예 / 아니요', { exact: true }).count(), 1);
  await button('우리 조 질문지 제출하기').click();
  await page.waitForFunction(() => window.testApp.calls.some((c) => c.name === 'questions'));
  const questions = (await calls('questions'))[0].args[2];
  assert.equal(questions.q1.scaleType, 'YES_NO');
  assert.equal(questions.q1.likertLabels, undefined);
  assert.equal(questions.q1.hasOtherOption, undefined);
  assert.equal(questions.q2.scaleType, 'LIKERT_5');
  assert.equal(questions.q3.scaleType, 'SHORT_ANSWER');

  await stage('responding');
  await button('예').waitFor();
  assert.equal(await button('다음').isDisabled(), true);
  assert.equal(await page.getByRole('group', { name: '예/아니요 응답' }).getByRole('button').count(), 2);
  await button('예').click();
  assert.equal(await button('예').getAttribute('aria-pressed'), 'true');
  await button('아니요').click();
  assert.equal(await button('예').getAttribute('aria-pressed'), 'false');
  assert.equal(await button('아니요').getAttribute('aria-pressed'), 'true');
  await button('다음').click();
  await page.getByText('방금 응답:', { exact: false }).waitFor();
  assert.match(await page.getByText('방금 응답:', { exact: false }).innerText(), /아니요/);
  await button('다음 질문 →').click();
  await button('4 그렇다').click();
  assert.equal(await button('예').count(), 0);
  await button('다음').click();
  await button('다음 질문 →').click();
  await page.getByRole('textbox').fill('2');
  await button('다음').click();
  await button('응답 완료').click();
  await page.waitForFunction(() => window.testApp.calls.some((c) => c.name === 'done'));
  assert.deepEqual((await calls('response')).map((c) => c.args[4]), ['아니요', 4, '2']);

  await stage('revision');
  await page.getByText('선택지: 예 / 아니요', { exact: false }).waitFor();
  await button('예/아니요').nth(1).click();
  await page.getByRole('button', { name: /수리.*제출/ }).click();
  await page.waitForFunction(() => window.testApp.calls.some((c) => c.name === 'revisions'));
  const revisions = (await calls('revisions'))[0].args[2];
  assert.equal(revisions.q1.scaleType, 'YES_NO');
  assert.equal(revisions.q2.scaleType, 'YES_NO');
  assert.equal(revisions.q2.likertLabels, undefined);
  assert.equal(revisions.q2.hasOtherOption, undefined);
  assert.equal(revisions.q3.scaleType, 'SHORT_ANSWER');
  assert.equal(await page.evaluate(() => window.testApp.sampleResponseValue('YES_NO')), '예');
  await stage('results');
  await page.getByText('질문 수리 완료!', { exact: true }).waitFor();
  await page.getByText('질문 수리 사례', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: binary question creation, preview, answer selection/storage, mixed types, revisions, rehearsal and results');
} finally {
  await browser?.close();
  await server.close();
}
