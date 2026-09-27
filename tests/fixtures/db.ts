export const calls: { name: string; args: unknown[] }[] = [];
export const storedResponses: Record<string, Record<string, { value: unknown; respondedAt: number }>> = {};
export const storedFeedback: Record<string, Record<string, { problemTypes: string[]; comment: string; createdAt: number }>> = {};

export async function submitQuestions(...args: unknown[]) {
  calls.push({ name: 'questions', args });
}
export async function setTeamTopic(...args: unknown[]) {
  calls.push({ name: 'topic', args });
}
export async function submitResponseAndFeedback(...args: unknown[]) {
  calls.push({ name: 'response', args });
  const target = args[2] as string;
  const qid = args[3] as string;
  (storedResponses[target] ??= {})[qid] = { value: args[4], respondedAt: Date.now() };
  (storedFeedback[target] ??= {})[qid] = { ...(args[5] as { problemTypes: string[]; comment: string }), createdAt: Date.now() };
}
export async function markRespondingDone(...args: unknown[]) {
  calls.push({ name: 'done', args });
}
export async function submitRevisions(...args: unknown[]) {
  calls.push({ name: 'revisions', args });
}
