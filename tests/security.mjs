import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  setLogLevel,
} from 'firebase/firestore';

setLogLevel('silent');
const projectId = 'demo-question-repair';
const env = await initializeTestEnvironment({
  projectId,
  firestore: { host: '127.0.0.1', port: 8080, rules: await readFile('firestore.rules', 'utf8') },
});
const db = (uid) => env.authenticatedContext(uid).firestore();
const teacher = db('teacher'),
  alice = db('alice'),
  bob = db('bob'),
  outsider = db('outsider');
const session = (store, id = 's123456') => doc(store, 'qrsSessions', id);
const team = (store, uid, id = 's123456') => doc(store, 'qrsSessions', id, 'teams', uid);
const initial = {
  schemaVersion: 2,
  sessionCode: '123456',
  teacherUid: 'teacher',
  status: 'LOBBY',
  currentPhase: 'LOBBY',
  createdAt: 1,
  teamCounter: 0,
  pokemonPool: Array.from({ length: 40 }, (_, i) => `${i + 1}조`),
};
const q = (type = 'YES_NO') => ({
  text: '스마트폰을 사용하나요?',
  scaleType: type,
  order: 1,
  createdAt: 1,
});
const questions = { q1: q(), q2: q('LIKERT_5'), q3: q('SHORT_ANSWER') };
const vite = await (
  await import('vite')
).createServer({ configFile: false, cacheDir: 'node_modules/.cache/qrs-test-security', server: { middlewareMode: true } });
const { joinTeamTransaction } = await vite.ssrLoadModule('/src/firebase/joinTeam.ts');
async function join(store, uid, id = 's123456') {
  return (await joinTeamTransaction(store, id, uid, true)).teamNumber;
}

try {
  await env.clearFirestore();
  await assertFails(setDoc(session(env.unauthenticatedContext().firestore()), initial));
  await assertFails(setDoc(session(outsider), initial));
  await assertSucceeds(setDoc(session(teacher), initial));
  await assertFails(getDocs(collection(outsider, 'qrsSessions')));
  await assertSucceeds(
    getDocs(query(collection(teacher, 'qrsSessions'), where('teacherUid', '==', 'teacher'))),
  );
  await assertFails(getDocs(collection(outsider, 'qrsSessions', 's123456', 'teams')));
  await assertFails(updateDoc(session(alice), { teamCounter: 1 }));
  await assertFails(
    setDoc(team(alice, 'alice'), {
      ownerUid: 'alice',
      teamNumber: 1,
      nickname: '조',
      createdAt: 1,
    }),
  );
  await assertSucceeds(join(alice, 'alice'));
  await assertSucceeds(join(bob, 'bob'));
  assert.equal(await join(db('alice'), 'alice'), 1);
  assert.equal((await getDoc(session(teacher))).data().teamCounter, 2);
  await assertSucceeds(getDocs(collection(alice, 'qrsSessions', 's123456', 'teams')));
  await assertFails(updateDoc(session(alice), { status: 'ENDED' }));
  await assertFails(updateDoc(session(teacher), { teacherUid: 'outsider' }));
  await assertFails(updateDoc(team(alice, 'alice'), { topic: '아직 시작 안 됨' }));
  await assertSucceeds(updateDoc(session(teacher), { status: 'ACTIVE', currentPhase: 'QUESTION' }));
  await assertFails(updateDoc(team(alice, 'bob'), { topic: '다른 조 수정' }));
  await assertSucceeds(
    updateDoc(team(alice, 'alice'), { topic: '스마트폰', questions, questionsSubmittedAt: 1 }),
  );
  await assertSucceeds(
    updateDoc(team(bob, 'bob'), { topic: '스마트폰', questions, questionsSubmittedAt: 1 }),
  );
  await assertFails(updateDoc(team(alice, 'alice'), { ownerUid: 'outsider' }));
  await assertFails(updateDoc(team(alice, 'alice'), { topic: '제출 후 변조' }));
  await assertSucceeds(updateDoc(session(teacher), { status: 'PAUSED' }));
  await assertFails(updateDoc(team(alice, 'alice'), { lastActiveAt: 2 }));
  await assertSucceeds(
    updateDoc(session(teacher), {
      status: 'ACTIVE',
      currentPhase: 'RESPONDING',
      assignments: { alice: ['bob'], bob: ['alice'] },
    }),
  );
  await assert.rejects(join(outsider, 'outsider'));
  {
    const b = writeBatch(outsider);
    b.update(session(outsider), { teamCounter: 3 });
    b.set(team(outsider, 'outsider'), {
      ownerUid: 'outsider',
      teamNumber: 3,
      nickname: '침입',
      createdAt: 1,
    });
    await assertFails(b.commit());
  }
  const feedback = { problemTypes: ['NONE'], comment: '', createdAt: 1 };
  const payload = {
    'responsesGiven.bob.q1': { value: '아니요', respondedAt: 1 },
    'feedbackGiven.bob.q1': feedback,
  };
  await assertFails(
    updateDoc(team(alice, 'alice'), {
      ...payload,
      'responsesGiven.bob.q1': { value: 'maybe', respondedAt: 1 },
    }),
  );
  await assertFails(
    updateDoc(team(alice, 'alice'), {
      'responsesGiven.alice.q1': { value: '예', respondedAt: 1 },
      'feedbackGiven.alice.q1': feedback,
    }),
  );
  await assertSucceeds(updateDoc(team(alice, 'alice'), payload));
  await assertFails(updateDoc(team(alice, 'alice'), { 'respondingProgress.bob': 'DONE' }));
  await assertSucceeds(
    updateDoc(team(alice, 'alice'), {
      'responsesGiven.bob.q2': { value: 4, respondedAt: 1 },
      'feedbackGiven.bob.q2': feedback,
      'responsesGiven.bob.q3': { value: '2', respondedAt: 1 },
      'feedbackGiven.bob.q3': feedback,
    }),
  );
  await assertSucceeds(updateDoc(team(alice, 'alice'), { 'respondingProgress.bob': 'DONE' }));
  await assertSucceeds(updateDoc(session(teacher), { currentPhase: 'REVISION' }));
  const r = {
    originalText: '처음 질문',
    revisedText: '수리한 질문',
    revisionReasons: ['CLARITY'],
    scaleType: 'YES_NO',
    createdAt: 1,
  };
  await assertSucceeds(
    updateDoc(team(alice, 'alice'), {
      revisions: { q1: r, q2: r, q3: r },
      revisionsSubmittedAt: 1,
    }),
  );
  await assertFails(deleteDoc(session(teacher)));
  await assertSucceeds(updateDoc(session(teacher), { status: 'ENDED', currentPhase: 'ENDED' }));
  await assertFails(updateDoc(session(teacher), { status: 'ACTIVE' }));
  await assert.rejects(join(outsider, 'outsider'));
  {
    const b = writeBatch(outsider);
    b.update(session(outsider), { teamCounter: 3 });
    b.set(team(outsider, 'outsider'), {
      ownerUid: 'outsider',
      teamNumber: 3,
      nickname: '침입',
      createdAt: 1,
    });
    await assertFails(b.commit());
  }
  await assertFails(deleteDoc(team(alice, 'alice')));
  const batch = writeBatch(teacher);
  batch.delete(team(teacher, 'alice'));
  batch.delete(team(teacher, 'bob'));
  batch.delete(session(teacher));
  await assertSucceeds(batch.commit());
  assert.equal((await getDoc(session(teacher))).exists(), false);
  // Legacy local-storage identities must not become authorization credentials.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(session(ctx.firestore(), 's000001'), {
      ...initial,
      schemaVersion: 1,
      teacherUid: 'usr_legacy',
    });
    await setDoc(team(ctx.firestore(), 'legacy', 's000001'), {
      ownerUid: 'usr_legacy',
      topic: 'old',
    });
  });
  await assertFails(getDoc(team(db('usr_legacy'), 'legacy', 's000001')));
  await assertFails(updateDoc(session(db('usr_legacy'), 's000001'), { schemaVersion: 2 }));
  console.log(
    'PASS: access rules, phase restrictions, answer validation, deletion and legacy protection',
  );
  // Contended joins from separate clients, including three tabs sharing an identity.
  await setDoc(session(teacher, 's777777'), { ...initial, sessionCode: '777777' });
  await Promise.all(
    Array.from({ length: 40 }, (_, i) => join(db(`student${i}`), `student${i}`, 's777777')),
  );
  await Promise.all(Array.from({ length: 3 }, () => join(db('student0'), 'student0', 's777777')));
  const joined = await getDocs(collection(teacher, 'qrsSessions', 's777777', 'teams'));
  assert.equal(joined.size, 40);
  assert.equal(new Set(joined.docs.map((d) => d.data().teamNumber)).size, 40);
  assert.equal((await getDoc(session(teacher, 's777777'))).data().teamCounter, 40);
  await assert.rejects(join(db('student41'), 'student41', 's777777'), /최대 40/);
  await updateDoc(session(teacher, 's777777'), { status: 'ACTIVE', currentPhase: 'QUESTION' });
  for (const uid of ['student1', 'student2', 'student3']) {
    if (uid === 'student1') {
      await assertFails(
        updateDoc(team(db(uid), uid, 's777777'), {
          questions: { ...questions, q2: { ...questions.q2, likertLabels: [{}, {}, {}, {}, {}] } },
          questionsSubmittedAt: 1,
        }),
      );
    }
    await updateDoc(team(db(uid), uid, 's777777'), {
      topic: '주제',
      questions,
      questionsSubmittedAt: 1,
    });
  }
  await updateDoc(session(teacher, 's777777'), {
    currentPhase: 'RESPONDING',
    assignments: { student0: ['student1', 'student2', 'student3'] },
  });
  for (const target of ['student1', 'student2', 'student3']) {
    for (const [qid, value] of [['q1', '예'], ['q2', 4], ['q3', '2']]) {
      await assertSucceeds(updateDoc(team(db('student0'), 'student0', 's777777'), {
        [`responsesGiven.${target}.${qid}`]: { value, respondedAt: 1 },
        [`feedbackGiven.${target}.${qid}`]: feedback,
      }));
    }
    await assertSucceeds(updateDoc(team(db('student0'), 'student0', 's777777'), { [`respondingProgress.${target}`]: 'DONE' }));
  }
  console.log(
    'PASS: Firestore permissions, typed answers, lifecycle, legacy denial, atomic delete and 40 concurrent joins + duplicate tabs',
  );
} finally {
  await env.cleanup();
  await vite.close();
}
