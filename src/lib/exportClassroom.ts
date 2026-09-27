import type { SessionData } from '../types';
import { QUESTION_IDS } from '../types';
import { getScaleTypeInfo } from './scaleTypes';
import { PROBLEM_TYPES } from './problemTypes';
import { REVISION_REASONS } from './revisionReasons';
import { getLikertLabels } from './likertScale';
import { formatAnswer, getResponseSummary } from './responseSummary';

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
      '수리 대상 질문',
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
            `${reviewer.teamNumber}조: ${formatAnswer(a.value, q)}`,
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
        q?.intentionalFlaw ? '예' : '',
        q?.text,
        q ? getScaleTypeInfo(q.scaleType).label : '',
        q?.scaleType === 'YES_NO'
          ? '예 / 아니요'
          : q?.scaleType === 'LIKERT_5'
            ? `${getLikertLabels(q.likertLabels).join(' / ')}${q.hasOtherOption ? ' / 기타(직접 작성)' : ''}`
            : q?.scaleType === 'MULTI_SELECT'
              ? `${q.options?.join(' / ') ?? ''}${q.hasOtherOption ? ' / 기타(직접 작성)' : ''}`
            : (q?.unit ?? ''),
        r?.revisedText,
        r ? getScaleTypeInfo(r.scaleType).label : '',
        r?.scaleType === 'YES_NO'
          ? '예 / 아니요'
          : r?.scaleType === 'LIKERT_5'
            ? `${getLikertLabels(r.likertLabels).join(' / ')}${r.hasOtherOption ? ' / 기타(직접 작성)' : ''}`
            : r?.scaleType === 'MULTI_SELECT'
              ? `${r.options?.join(' / ') ?? ''}${r.hasOtherOption ? ' / 기타(직접 작성)' : ''}`
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

function html(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c] ?? c);
}

export function classroomHTML(data: SessionData): string {
  const teams = Object.entries(data.teams).sort((a, b) => a[1].teamNumber - b[1].teamNumber);
  const questionCount = teams.reduce((n, [, team]) => n + QUESTION_IDS.filter((qid) => team.questions?.[qid]).length, 0);
  const responseCount = teams.reduce((n, [, team]) => n + Object.values(team.responsesGiven ?? {}).reduce((sum, qs) => sum + Object.keys(qs).length, 0), 0);
  const revisionCount = teams.reduce((n, [, team]) => n + QUESTION_IDS.filter((qid) => team.revisions?.[qid]).length, 0);
  const cards = teams.map(([id, team]) => `<section class="team">
    <header><div><small>TEAM ${html(team.teamNumber)}</small><h2>${html(team.teamNumber)}조 · ${html(team.nickname)}</h2></div><p>${html(team.topic || '조사 주제 미제출')}</p></header>
    <div class="questions">${QUESTION_IDS.map((qid, i) => {
      const q = team.questions?.[qid];
      const revision = team.revisions?.[qid];
      if (!q) return '';
      const summary = getResponseSummary(data.teams, id, qid, q);
      const comments = teams.flatMap(([, reviewer]) => {
        const entry = reviewer.feedbackGiven?.[id]?.[qid];
        return entry?.comment ? [entry.comment] : [];
      });
      return `<article class="question"><div class="qtop"><span>Q${i + 1}</span>${q.intentionalFlaw ? '<b>친구들이 수리할 질문</b>' : ''}<em>${html(getScaleTypeInfo(q.scaleType).label)}</em></div>
        <h3>${html(q.text)}</h3>
        <div class="result"><strong>익명 응답 · ${summary.total}개 조</strong>
          ${summary.counts.length ? `<div class="counts">${summary.counts.map(({label,count}) => `<div><span>${html(label)}</span><b>${count}개 조</b></div>`).join('')}</div>` : ''}
          ${summary.written.length ? `<div class="written"><small>직접 쓴 응답과 기타 이유</small>${summary.written.map((v) => `<p>${html(v)}</p>`).join('')}</div>` : ''}
          ${summary.total === 0 ? '<p class="empty">응답 없음</p>' : ''}
        </div>
        ${comments.length ? `<div class="feedback"><strong>친구들의 의견</strong>${comments.map((v) => `<p>${html(v)}</p>`).join('')}</div>` : ''}
        ${revision ? `<div class="revision"><small>수리 후 질문</small><p>${html(revision.revisedText)}</p></div>` : ''}
      </article>`;
    }).join('')}</div></section>`).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>질문수리소 · 우리 반 설문 결과</title><style>
  :root{color-scheme:light;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#10243e;background:#f3f7fd}*{box-sizing:border-box}body{margin:0}main{max-width:1100px;margin:auto;padding:48px 24px 80px}.hero{border-radius:28px;background:linear-gradient(125deg,#0d3fb0,#2563eb);color:white;padding:40px;box-shadow:0 16px 40px #1e40af26}.hero small,.team small{letter-spacing:.12em;font-weight:800}.hero h1{font-size:clamp(28px,4vw,44px);margin:12px 0}.hero p{margin:0;color:#dbeafe}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0 34px}.stat{background:white;border:1px solid #dce7f6;border-radius:18px;padding:18px}.stat b{display:block;font-size:30px;color:#1554d1}.stat span{font-size:13px;color:#64748b}.team{background:white;border:1px solid #dce7f6;border-radius:24px;margin:24px 0;overflow:hidden;box-shadow:0 8px 30px #1e40af0a}.team header{padding:25px 30px;border-bottom:1px solid #e6edf8;display:flex;justify-content:space-between;gap:16px;align-items:end}.team header small{color:#2563eb}.team h2{margin:5px 0 0}.team header p{margin:0;color:#64748b}.questions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:20px}.question{border:1px solid #e1e9f5;border-radius:18px;padding:20px;min-width:0}.qtop{display:flex;align-items:center;gap:8px;color:#2563eb;font-weight:800}.qtop b{font-size:11px;color:#92400e;background:#fef3c7;border-radius:99px;padding:5px 8px}.qtop em{margin-left:auto;font-size:11px;color:#64748b;font-style:normal}.question h3{font-size:17px;line-height:1.5;min-height:52px;overflow-wrap:anywhere}.result,.feedback,.revision{margin-top:16px;padding:14px;border-radius:12px;background:#eff6ff;font-size:13px}.counts{margin-top:10px}.counts div{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-top:1px solid #dbeafe}.counts b{white-space:nowrap;color:#1d4ed8}.written,.feedback{margin-top:12px}.written p,.feedback p{margin:7px 0 0;padding:8px;background:white;border-radius:8px;overflow-wrap:anywhere}.feedback{background:#f8fafc}.revision{background:#e8f1ff;border-left:3px solid #2563eb}.revision p{font-size:15px;font-weight:700;margin:6px 0 0}.empty{color:#64748b}@media(max-width:800px){.questions{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.team header{display:block}.team header p{margin-top:8px}}
  </style></head><body><main><div class="hero"><small>QUESTION WORKSHOP · CLASS REPORT</small><h1>우리 반 설문 결과</h1><p>수업 코드 ${html(data.session.sessionCode)} · 질문부터 응답, 수리까지 한눈에</p></div>
  <div class="stats"><div class="stat"><b>${teams.length}</b><span>참여 조</span></div><div class="stat"><b>${questionCount}</b><span>작성한 질문</span></div><div class="stat"><b>${responseCount}</b><span>제출된 문항 응답</span></div><div class="stat"><b>${revisionCount}</b><span>수리한 질문</span></div></div>
  <p style="color:#64748b;font-size:13px">응답은 조별 기기 1대에서 제출한 값으로 집계했습니다. 복수 선택 문항의 선택지별 합계는 전체 응답 조 수보다 클 수 있습니다.</p>${cards}</main></body></html>`;
}

export function downloadClassroomHTML(data: SessionData) {
  const url = URL.createObjectURL(new Blob([classroomHTML(data)], { type: 'text/html;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `질문수리소_${data.session.sessionCode}_결과.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
