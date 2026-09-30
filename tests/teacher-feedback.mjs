import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.cache/qrs-test-teacher-feedback', server: { middlewareMode: true } });
try {
  const { teacherFeedbackSummary } = await server.ssrLoadModule('/src/lib/teacherFeedbackSummary.ts');
  const build = (total, votes) => {
    const teams = { target: { teamNumber: 1, nickname: '연두', questions: { q1: { text: '시험 문항', scaleType: 'YES_NO' } } } };
    for (let i = 0; i < total; i++) teams[`reviewer${i}`] = {
      teamNumber: i + 2,
      responsesGiven: { target: { q1: { value: i % 2 ? '예' : '아니요' } } },
      feedbackGiven: { target: { q1: { problemTypes: i < votes ? ['UNCLEAR', 'UNCLEAR'] : ['NONE'], comment: i < votes ? '모호함' : '' } } },
    };
    return teams;
  };
  assert.deepEqual(teacherFeedbackSummary(build(0, 0)), []);
  assert.deepEqual(teacherFeedbackSummary(build(10, 2)), []);
  assert.deepEqual(teacherFeedbackSummary(build(7, 2)), []);
  const boundary = teacherFeedbackSummary(build(10, 3));
  assert.equal(boundary[0].questions.length, 1);
  assert.equal(boundary[0].questions[0].responseCount, 10);
  assert.equal(boundary[0].questions[0].pointedOutCount, 3);
  assert.equal(boundary[0].questions[0].comments.length, 3);
  assert.equal(teacherFeedbackSummary(build(3, 1))[0].questions.length, 1);
  const missing = build(10, 2);
  for (let i = 2; i < 10; i++) delete missing[`reviewer${i}`].feedbackGiven;
  missing.orphan = { feedbackGiven: { target: { q1: { problemTypes: ['UNCLEAR'], comment: '응답 없는 평가' } } } };
  missing.target.responsesGiven = { target: { q1: { value: '예' } } };
  missing.target.feedbackGiven = { target: { q1: { problemTypes: ['UNCLEAR'] } } };
  assert.deepEqual(teacherFeedbackSummary(missing), []);
  const multiple = build(10, 3);
  for (let i = 0; i < 3; i++) {
    multiple[`reviewer${i}`].responsesGiven.target.q2 = { value: '' };
    multiple[`reviewer${i}`].feedbackGiven.target.q2 = { problemTypes: ['LEADING', 'UNCLEAR'] };
  }
  multiple.target.questions.q2 = { text: '또 다른 문항', scaleType: 'ESSAY' };
  const summary = teacherFeedbackSummary(multiple);
  assert.equal(summary[0].problemType, 'UNCLEAR');
  assert.equal(summary[0].questions.length, 2);
  assert.equal(summary[1].problemType, 'LEADING');
  assert.equal(summary[1].questions.length, 1);
  console.log('PASS: inclusive 30% threshold, per-question denominators, missing feedback, orphan/self feedback, duplicate votes, multiple types and question counts');
} finally { await server.close(); }
