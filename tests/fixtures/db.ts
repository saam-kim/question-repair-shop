export const calls: { name: string; args: unknown[] }[] = [];

export async function submitQuestions(...args: unknown[]) {
  calls.push({ name: 'questions', args });
}
export async function setTeamTopic(...args: unknown[]) {
  calls.push({ name: 'topic', args });
}
export async function submitResponseAndFeedback(...args: unknown[]) {
  calls.push({ name: 'response', args });
}
export async function markRespondingDone(...args: unknown[]) {
  calls.push({ name: 'done', args });
}
export async function submitRevisions(...args: unknown[]) {
  calls.push({ name: 'revisions', args });
}
