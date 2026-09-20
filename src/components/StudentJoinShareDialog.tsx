import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Icon } from './Icon';

interface StudentJoinShareDialogProps {
  studentUrl: string;
  sessionCode: string;
  onClose: () => void;
}

export function StudentJoinShareDialog({
  studentUrl,
  sessionCode,
  onClose,
}: StudentJoinShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const displayUrl = studentUrl.replace(/^https?:\/\//, '');
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(studentUrl);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
      aria-labelledby="student-join-title"
    >
      <div className="relative p-6 text-center sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="학생 초대 창 닫기"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-50"
        >
          <Icon name="close" />
        </button>
        <h2 id="student-join-title" className="text-2xl font-bold text-slate-900">
          학생 입장 QR
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          조별 대표 기기 한 대로 QR을 스캔하세요.
          <br />
          스캔이 어려우면 아래 짧은 링크나 수업 코드를 이용하세요.
        </p>

        <div className="mx-auto mt-5 inline-flex rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <QRCodeSVG value={studentUrl} size={220} level="M" includeMargin />
        </div>
        {copyError && (
          <p role="alert" className="mt-3 text-xs text-rose-700">
            자동 복사가 지원되지 않습니다. 링크를 길게 누르거나 주소를 선택해 복사해주세요.
          </p>
        )}

        <div className="mt-5 rounded-2xl bg-blue-50 px-4 py-3">
          <p className="text-xs font-medium text-blue-500">수업 코드</p>
          <p className="mt-0.5 text-2xl font-bold tracking-[0.18em] text-blue-700">{sessionCode}</p>
        </div>

        <div className="mt-4 text-left">
          <p className="mb-2 text-xs font-medium text-slate-500">직접 입장 링크</p>
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <a
              href={studentUrl}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate px-3 py-3 font-mono text-xs text-blue-700 underline"
            >
              {displayUrl}
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="border-l border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {copied ? '복사됨' : '링크 복사'}
            </button>
          </div>
        </div>

        <button type="button" onClick={onClose} className="btn-primary mt-5 w-full">
          수업 화면으로 가기
        </button>
      </div>
    </dialog>
  );
}
