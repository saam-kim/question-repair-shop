import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.cache/qrs-test-cleanup', server: { middlewareMode: true } });
try {
  const drafts = await server.ssrLoadModule('/src/lib/questionDraft.ts');
  const { applyConfirmedPatch } = await server.ssrLoadModule('/src/lib/confirmedUpdates.ts');
  const store = await server.ssrLoadModule('/src/lib/rehearsalStore.ts');
  const base = { text: '질문', scaleType: 'MULTI_SELECT', isCustomLikert: false, likertLabels: ['1', '2', '3', '4', '5'], hasOtherOption: false, options: ['가', '나', '다'], unit: '' };
  for (const length of [2, 3, 4, 5]) {
    const value = { ...base, options: ['가', '나', '다', '라', '마'].slice(0, length), intentionalFlaw: false };
    const record = { q1: value, q2: value, q3: value };
    assert(drafts.isQuestionDraftRecord(JSON.parse(JSON.stringify(record))));
    assert(drafts.isDraftValid(value));
    const revision = { ...value, reasons: ['CLARITY'] };
    assert(drafts.isRevisionDraftRecord({ q1: revision, q2: revision, q3: revision }));
  }
  assert(!drafts.isDraftValid({ ...base, options: ['가', ' 가 '] }));
  assert(!drafts.isDraftValid({ ...base, options: ['가', ''] }));
  assert(!drafts.isDraftValid({ ...base, scaleType: 'LIKERT_5', isCustomLikert: true, likertLabels: ['1', '2'] }));
  assert(!drafts.isQuestionDraftRecord({ q1: { ...base, intentionalFlaw: false, options: [1, 2] }, q2: base, q3: base }));
  assert.equal(drafts.questionInputFromDraft({ ...base, scaleType: 'YES_NO', hasOtherOption: true }).hasOtherOption, undefined);
  const original = { responsesGiven: { a: { q1: { value: '예' }, q2: { value: '아니요' } }, b: { q1: { value: '예' } } }, topic: '유지' };
  const patched = applyConfirmedPatch(original, { 'responsesGiven.a.q1': { value: '아니요' }, 'responsesGiven.a.q3': { value: '예' } });
  assert.equal(original.responsesGiven.a.q1.value, '예');
  assert.equal(patched.responsesGiven.a.q1.value, '아니요');
  assert.strictEqual(patched.responsesGiven.a.q2, original.responsesGiven.a.q2);
  assert.strictEqual(patched.responsesGiven.b, original.responsesGiven.b);
  const id = store.createRehearsal();
  const before = store.getRehearsal(id);
  await store.updateRehearsal(id, 'team1', { topic: '바꾼 주제' });
  const after = store.getRehearsal(id);
  assert.equal(before.teams.team1.topic, undefined);
  assert.equal(after.teams.team1.topic, '바꾼 주제');
  assert.strictEqual(after.teams.team2, before.teams.team2);
  assert.strictEqual(after.session, before.session);
  store.closeRehearsal(id);
  assert.equal(store.getRehearsal(id), null);
  console.log('PASS: variable-length question/revision drafts, validation, immutable nested patches and rehearsal structural sharing');
} finally { await server.close(); }
