export function QuestionWritingGuide() {
  return (
    <details className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-slate-700">
      <summary className="cursor-pointer font-semibold text-blue-800">질문지 작성 시 유의 사항 보기</summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-6">
        <li>질문의 의미가 분명해야 합니다. 어려운 표현이나 모호한 범위를 피하세요.</li>
        <li>한 문항에서는 한 가지 내용만 물어보세요.</li>
        <li>특정 답을 유도하는 표현을 피하세요.</li>
        <li>선택지는 응답자가 고르기 쉽도록 만들고, 서로 겹치지 않게 하세요.</li>
        <li>응답자가 실제로 알거나 기억할 수 있는 내용을 물어보세요.</li>
      </ul>
      <p className="mt-3 border-t border-blue-200 pt-3 text-blue-800">
        이번 활동에서는 이 조건 중 한 가지를 일부러 어긴 질문도 1개 만듭니다. 친구들의 응답과 피드백을 받은 뒤 고쳐보세요.
      </p>
    </details>
  );
}
