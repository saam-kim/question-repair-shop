import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface StudentJoinShareDialogProps {
  studentUrl: string;
  sessionCode: string;
  onClose: () => void;
}

export function StudentJoinShareDialog({ studentUrl, sessionCode, onClose }: StudentJoinShareDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(studentUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-join-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl" aria-hidden>📱</div>
        <h2 id="student-join-title" className="mt-4 text-2xl font-bold text-slate-900">학생 입장 QR</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          학생들은 패드로 이 QR을 스캔해 바로 입장합니다.<br />
          스캔이 어려우면 아래 링크를 열어주세요.
        </p>

        <div className="mx-auto mt-5 inline-flex rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <QRCodeSVG value={studentUrl} size={220} level="M" includeMargin />
        </div>

        <div className="mt-5 rounded-2xl bg-blue-50 px-4 py-3">
          <p className="text-xs font-medium text-blue-500">수업 코드</p>
          <p className="mt-0.5 text-2xl font-bold tracking-[0.18em] text-blue-700">{sessionCode}</p>
        </div>

        <div className="mt-4 flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left">
          <a href={studentUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate px-3 py-3 text-sm text-blue-700 underline">
            {studentUrl}
          </a>
          <button type="button" onClick={handleCopy} className="border-l border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {copied ? '복사됨' : '링크 복사'}
          </button>
        </div>

        <button type="button" onClick={onClose} className="mt-5 w-full rounded-2xl bg-blue-600 py-3.5 font-semibold text-white hover:bg-blue-700">
          수업 화면으로 가기
        </button>
      </div>
    </div>
  );
}
