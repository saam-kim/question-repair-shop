import type { SessionData } from '../types';
import { QUESTION_IDS } from '../types';
import { getScaleTypeInfo } from './scaleTypes';
import { PROBLEM_TYPES } from './problemTypes';
import { REVISION_REASONS } from './revisionReasons';
import { formatLikertResponse, getLikertLabels } from './likertScale';

function cell(value: unknown): string {
  let s = String(value ?? '');
  // Spreadsheet applications must treat student-authored text as text, never formulas.
  if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function classroomCSV(data: SessionData): string {
  const rows: unknown[][] = [
    [
      '조',
      '조 이름',
      '조사 주제',
      '문항',
      '처음 질문',
      '응답 방식',
      '선택지',
      '수리한 질문',
      '수리 후 응답 방식',
      '수리 후 선택지',
      '수정 이유',
      '받은 응답',
      '받은 피드백',
    ],
  ];
  const teams = Object.entries(data.teams).sort((a, b) => a[1].teamNumber - b[1].teamNumber);
  for (const [id, team] of teams) {
    for (const qid of QUESTION_IDS) {
      const q = team.questions?.[qid];
      const r = team.revisions?.[qid];
      const responses: string[] = [],
        feedback: string[] = [];
      for (const [, reviewer] of teams) {
        const a = reviewer.responsesGiven?.[id]?.[qid];
        const f = reviewer.feedbackGiven?.[id]?.[qid];
        if (a)
          responses.push(
            `${reviewer.teamNumber}조: ${q?.scaleType === 'LIKERT_5' ? formatLikertResponse(a.value, q.likertLabels) : a.value}`,
          );
        if (f)
          feedback.push(
            `${reviewer.teamNumber}조: ${f.problemTypes.map((p) => PROBLEM_TYPES.find((t) => t.id === p)?.label ?? p).join(', ')}${f.comment ? ' / ' + f.comment : ''}`,
          );
      }
      rows.push([
        team.teamNumber,
        team.nickname,
        team.topic,
        qid.toUpperCase(),
        q?.text,
        q ? getScaleTypeInfo(q.scaleType).label : '',
        q?.scaleType === 'YES_NO'
          ? '예 / 아니요'
          : q?.scaleType === 'LIKERT_5'
            ? getLikertLabels(q.likertLabels).join(' / ')
            : (q?.unit ?? ''),
        r?.revisedText,
        r ? getScaleTypeInfo(r.scaleType).label : '',
        r?.scaleType === 'YES_NO'
          ? '예 / 아니요'
          : r?.scaleType === 'LIKERT_5'
            ? getLikertLabels(r.likertLabels).join(' / ')
            : (r?.unit ?? ''),
        r?.revisionReasons
          .map((reason) => REVISION_REASONS.find((t) => t.id === reason)?.label ?? reason)
          .join(' / '),
        responses.join('\n'),
        feedback.join('\n'),
      ]);
    }
  }
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
export function downloadClassroom(data: SessionData) {
  const url = URL.createObjectURL(
    new Blob([classroomCSV(data)], { type: 'text/csv;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `질문수리소_${data.session.sessionCode}_결과.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
