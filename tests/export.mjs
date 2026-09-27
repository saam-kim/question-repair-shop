import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.cache/qrs-test-export', server: { middlewareMode: true } });
try {
  const { classroomCSV, classroomHTML } = await server.ssrLoadModule('/src/lib/exportClassroom.ts');
  const data = {
    session: { sessionCode: '123456' },
    teams: {
      privateUid: {
        ownerUid: 'private-identity',
        teamNumber: 1,
        nickname: '연두',
        topic: '=1+1',
        questions: {
          q1: { text: '줄1\n"줄2"', scaleType: 'YES_NO', intentionalFlaw: true },
          q2: { text: '만족도', scaleType: 'LIKERT_5' },
          q3: { text: '<script>alert(1)</script>', scaleType: 'MULTI_SELECT', options: ['독서', '운동'], hasOtherOption: true },
        },
        revisions: {
          q1: { revisedText: '+cmd', scaleType: 'YES_NO', revisionReasons: ['CLARITY'] },
        },
      },
      reviewerUid: {
        ownerUid: 'reviewer-identity', teamNumber: 2, nickname: '바다',
        responsesGiven: { privateUid: { q1: { value: '예' }, q3: { value: ['독서', '기타: 그림'] } } },
      },
    },
  };
  const csv = classroomCSV(data);
  const report = classroomHTML(data);
  assert(csv.startsWith('\uFEFF'));
  assert(csv.includes('"\'=1+1"'));
  assert(csv.includes('"\'+cmd"'));
  assert(csv.includes('"줄1\n""줄2"""'));
  assert(csv.includes('예 / 아니요') && csv.includes('전혀 그렇지 않다'));
  assert(!csv.includes('privateUid') && !csv.includes('private-identity'));
  assert(report.includes('우리 반 설문 결과') && report.includes('익명 응답 · 1개 조'));
  assert(report.includes('1. 독서') && report.includes('기타: 그림') === false);
  assert(report.includes('그림'));
  assert(report.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert(!report.includes('<script>alert(1)</script>'));
  assert(!report.includes('privateUid') && !report.includes('reviewerUid'));
  console.log(
    'PASS: CSV Korean encoding, escaping, spreadsheet formula neutralization and identity omission',
  );
} finally {
  await server.close();
}
