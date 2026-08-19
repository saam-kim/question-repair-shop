import { useState } from 'react';
import { setTeamTopic } from '../../../firebase/db';
import { Card } from '../../../components/Card';
import { BottomActionBar } from '../../../components/BottomActionBar';

const EXAMPLES = [
  '학생들의 학교생활 만족도',
  '학생들의 스마트폰 사용',
  '청소년의 여가생활',
  '학교 급식 만족도',
  '학생들의 수면 습관',
  '학생들의 독서 습관',
];

export function TopicStep({ sessionId, teamId }: { sessionId: string; teamId: string }) {
  const [topic, setTopic] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!topic.trim()) return;
    setSaving(true);
    try {
      await setTeamTopic(sessionId, teamId, topic.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-10 py-6">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">우리 조의 조사</h1>
            <p className="mt-1 text-slate-500">조사 주제를 정해보세요.</p>

            <Card className="mt-5 p-5">
              <p className="text-sm font-medium text-slate-500">예시 (눌러서 사용하기)</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setTopic(ex)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-blue-300 hover:text-blue-700"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </Card>

            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              지나치게 개인적이거나 민감한 정보를 조사 주제로 정하지 않도록 주의해주세요.
            </p>
          </div>

          <Card className="flex flex-col justify-center p-6">
            <label className="block text-sm font-medium text-slate-700">조사 주제</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 학생들의 학교생활 만족도"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-4 text-xl outline-none focus:border-blue-500"
            />
          </Card>
        </div>
      </div>

      <BottomActionBar onClick={handleSubmit} disabled={!topic.trim() || saving}>
        {saving ? '저장하는 중...' : '다음 단계로'}
      </BottomActionBar>
    </div>
  );
}
