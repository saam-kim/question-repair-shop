import { lazy, Suspense, useState } from 'react';
import { Icon } from './Icon';
import { LoadingScreen } from './LoadingScreen';

const RehearsalOverlay = lazy(() =>
  import('../pages/teacher/RehearsalOverlay').then((m) => ({ default: m.RehearsalOverlay })),
);

const steps = [
  ['질문 만들기', '주제를 정하고 조별로 질문 3개를 작성합니다.', '10분'],
  ['서로 응답하기', '배정된 조의 질문에 답하고 불편한 점을 남깁니다.', '12분'],
  ['피드백 읽기', '다른 조가 느낀 어려움을 함께 살펴봅니다.', '5분'],
  ['질문 수리하기', '질문과 응답 방식을 고치고 이유를 설명합니다.', '10분'],
  ['결과 나누기', '수리 전후를 비교하며 좋은 질문의 조건을 정리합니다.', '8분'],
];

export function ClassGuide() {
  const [showRehearsal, setShowRehearsal] = useState(false);
  return (
    <>
      <details className="class-guide" id="class-guide">
        <summary>
          <span className="flex items-center gap-3">
            <Icon name="book" />
            처음이라면, 수업 운영 가이드
          </span>
          <span className="text-xs font-normal text-slate-500">펼쳐보기</span>
        </summary>
        <div className="guide-content">
          <div>
            <p className="eyebrow">수업 전 준비</p>
            <h3>조별 기기 한 대로 시작하세요.</h3>
            <p>
              2~40개 조, 인터넷이 연결된 기기, 교사 화면을 보여줄 스크린을 준비하세요. 한 조에서는
              대표 기기 한 대로 접속합니다.
            </p>
            <p className="mt-3">
              교사가 수업을 만들고 QR 또는 6자리 코드를 공유하면 학생들이 입장합니다. 단계 전환은
              교사가 진행합니다.
            </p>
            <p className="mt-3 text-sm">
              기존 수업은 수업을 만든 기기의 같은 브라우저에서 이어갈 수 있습니다.
            </p>
            <p className="mt-3 text-sm">
              시크릿 모드와 브라우저 데이터 삭제를 피해주세요. 기기를 바꾸면 기존 조나 교사 권한을
              이어받을 수 없습니다. 응답 배정 후에는 새 조의 입장이 닫힙니다.
            </p>
            <p className="mt-3 text-sm">
              이름·연락처 등 개인정보를 질문이나 응답에 적지 않도록 안내하세요. 수업 후 필요한 결과를
              내려받고 종료된 수업의 기록을 삭제할 수 있습니다.
            </p>
          </div>
          <div>
            <p className="eyebrow">45분 수업 운영 예시</p>
            <ol className="guide-steps">
              {steps.map(([title, desc, time], i) => (
                <li key={title}>
                  <span className="step-number">{i + 1}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{desc}</p>
                  </div>
                  <span className="text-xs text-slate-500">{time}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              권장 시간은 예시입니다. 학급 규모와 진행 속도에 맞춰 조절하세요.
            </p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 md:col-span-2">
            <p className="eyebrow text-blue-700">학교 네트워크 사전 점검</p>
            <h3>수업 5분 전, 실제 교실 Wi-Fi에서 한 조만 먼저 연결해보세요.</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
              <li>교사 기기에서 새 수업을 만들고, 학생 기기 한 대가 QR 또는 수업 코드로 입장되는지 확인합니다.</li>
              <li>Chrome 또는 Edge 최신 버전을 사용하고, 시크릿 모드와 브라우저 데이터 삭제는 피해주세요.</li>
              <li>
                인증 또는 수업 연결 오류가 반복되면 네트워크 담당자에게 아래 주소의 HTTPS(443) 연결과 지속 연결(롱폴링)을 허용해 달라고 요청하세요.
                <span className="mt-2 block break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-700">
                  question-repair-shop.vercel.app · identitytoolkit.googleapis.com · securetoken.googleapis.com · firestore.googleapis.com
                </span>
              </li>
              <li>수업 중 연결이 잠시 끊기면 탭을 닫거나 새로고침하지 말고, 연결이 돌아온 뒤 다시 연결하거나 제출을 다시 시도합니다.</li>
            </ol>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">수업 전에 한 번 연습해보세요</h3>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              예시 조로 학생 활동과 진행 순서를 살펴봅니다. 실제 수업에 영향을 주지 않으며, 닫으면 연습 내용이 사라집니다.
            </p>
          </div>
          <button type="button" onClick={() => setShowRehearsal(true)} className="btn-secondary shrink-0">
            수업 미리 연습하기
            <Icon name="arrow" className="h-4 w-4" />
          </button>
        </div>
      </details>
      {showRehearsal && (
        <Suspense fallback={<LoadingScreen />}>
          <RehearsalOverlay onClose={() => setShowRehearsal(false)} />
        </Suspense>
      )}
    </>
  );
}
