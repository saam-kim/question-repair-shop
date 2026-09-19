import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.cache/qrs-test-export', server: { middlewareMode: true } });
try {
  const { classroomCSV } = await server.ssrLoadModule('/src/lib/exportClassroom.ts');
  const csv = classroomCSV({
    session: { sessionCode: '123456' },
    teams: {
      privateUid: {
        ownerUid: 'private-identity',
        teamNumber: 1,
        nickname: '연두',
        topic: '=1+1',
        questions: {
          q1: { text: '줄1\n"줄2"', scaleType: 'YES_NO' },
          q2: { text: '만족도', scaleType: 'LIKERT_5' },
        },
        revisions: {
          q1: { revisedText: '+cmd', scaleType: 'YES_NO', revisionReasons: ['CLARITY'] },
        },
      },
    },
  });
  assert(csv.startsWith('\uFEFF'));
  assert(csv.includes('"\'=1+1"'));
  assert(csv.includes('"\'+cmd"'));
  assert(csv.includes('"줄1\n""줄2"""'));
  assert(csv.includes('예 / 아니요') && csv.includes('전혀 그렇지 않다'));
  assert(!csv.includes('privateUid') && !csv.includes('private-identity'));
  console.log(
    'PASS: CSV Korean encoding, escaping, spreadsheet formula neutralization and identity omission',
  );
} finally {
  await server.close();
}
