import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { chromium, webkit } from 'playwright';
const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const server = await createServer({
  configFile: false, root: fileURLToPath(new URL('..', import.meta.url)),
  cacheDir: 'node_modules/.cache/qrs-network', server: { host: '127.0.0.1', port: 0 },
  resolve: { alias: [
    { find: /^firebase\/firestore$/, replacement: fixture('network-firestore.ts') },
    { find: /^\.\/config$/, replacement: fixture('network-config.ts') },
  ] },
  plugins: [react(), tailwindcss(), { name: 'network-test', configureServer(vite) {
    vite.middlewares.use('/__network', async (_req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.end(await vite.transformIndexHtml('/__network', '<html><body><div id="root"></div><script type="module" src="/tests/fixtures/network.tsx"></script></body></html>'));
    });
  } }],
});
let browser;
try {
  await server.listen();
  const engine = process.env.PLAYWRIGHT_BROWSER === 'webkit' ? webkit : chromium;
  browser = await engine.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__network`);
  await page.getByLabel('조사 주제').fill('입력 내용이 사라지면 안 돼요');
  await page.clock.install();
  await page.getByRole('button', { name: '다음 단계로' }).click();
  await page.clock.runFor(10500);
  assert.equal(await page.getByRole('button', { name: '저장하는 중...' }).isDisabled(), true);
  assert.equal(await page.getByLabel('조사 주제').inputValue(), '입력 내용이 사라지면 안 돼요');
  assert.equal(await page.evaluate(() => window.networkTest.state.writes), 1);
  assert.equal(await page.evaluate(() => window.networkTest.state.reconnects), 1);
  // Rejecting a save retains the draft; it must not advance optimistically.
  await page.evaluate(() => window.networkTest.state.pending.shift().reject(new Error('unavailable')));
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByLabel('조사 주제').inputValue(), '입력 내용이 사라지면 안 돼요');
  await page.getByRole('button', { name: '다음 단계로' }).click();
  await page.evaluate(() => window.networkTest.state.acknowledge());
  await page.getByRole('heading', { name: '질문 3개 만들기' }).waitFor();
  // The backend acknowledged the save, but never emitted another snapshot.
  assert.equal(await page.evaluate(() => window.networkTest.state.writes), 2);
  // A teacher's confirmed phase change also renders immediately, without Listen.
  await page.evaluate(() => { void window.networkTest.advancePhase('s123456', 'REVISION'); });
  await page.evaluate(() => window.networkTest.state.acknowledge());
  await page.getByRole('heading', { name: '질문 수리하기' }).waitFor();
  // Dotted patches must preserve sibling answers, including when editing Q1.
  for (const [qid, value] of [['q1', '예'], ['q2', '아니요'], ['q1', '아니요']]) {
    await page.evaluate(([q, v]) => { void window.networkTest.submitResponseAndFeedback('s123456', 'student', 'other', q, v, { problemTypes: ['NONE'], comment: '' }); }, [qid, value]);
    await page.evaluate(() => window.networkTest.state.acknowledge());
  }
  await page.waitForFunction(() => JSON.parse(document.querySelector('[data-testid="responses"]').textContent).other?.q2?.value === '아니요');
  const responses = JSON.parse(await page.getByTestId('responses').innerText());
  assert.equal(responses.other.q1.value, '아니요');
  assert.equal(responses.other.q2.value, '아니요');
  // External phase change with no listener delivery is recovered by the independent read.
  await page.evaluate(() => { window.networkTest.state.docs['qrsSessions/s123456'].currentPhase = 'FEEDBACK_REVIEW'; });
  await page.clock.runFor(18000);
  await page.getByRole('heading', { name: '우리 조 질문 수리하기' }).waitFor();
  // A stale cached event must not roll a recovered phase backwards.
  await page.evaluate(() => {
    const api = window.networkTest;
    api.state.docs['qrsSessions/s123456'].currentPhase = 'QUESTION';
    api.emitCache('qrsSessions/s123456');
  });
  assert.equal(await page.getByTestId('phase').innerText(), 'FEEDBACK_REVIEW');
  // An old fallback read finishing after a newer acknowledged write cannot undo it.
  await page.evaluate(() => { window.networkTest.state.holdReads = true; });
  await page.clock.runFor(18000);
  await page.waitForFunction(() => window.networkTest.state.delayedReads.length > 0);
  await page.evaluate(() => { void window.networkTest.advancePhase('s123456', 'RESULT'); });
  await page.evaluate(() => window.networkTest.state.acknowledge());
  await page.waitForFunction(() => document.querySelector('[data-testid="phase"]').textContent === 'RESULT');
  await page.evaluate(() => {
    const state = window.networkTest.state;
    state.holdReads = false;
    state.delayedReads.splice(0).forEach((resolve) => resolve());
  });
  assert.equal(await page.getByTestId('phase').innerText(), 'RESULT');
  const writesBeforeReconnect = await page.evaluate(() => window.networkTest.state.writes);
  await page.context().setOffline(true);
  await page.getByText('인터넷 연결이 끊겼습니다.', { exact: false }).waitFor();
  await page.context().setOffline(false);
  await page.waitForFunction(() => window.networkTest.state.reconnects >= 2);
  assert.equal(await page.evaluate(() => window.networkTest.state.writes), writesBeforeReconnect);
  assert.deepEqual(errors, []);
  console.log('PASS: delayed/rejected writes, single reconnect, no duplicate submissions, confirmed progress without snapshots, preserved sibling answers, missed phase recovery and stale-cache protection');
} finally { await browser?.close(); await server.close(); }
