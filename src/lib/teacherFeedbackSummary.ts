import { PROBLEM_TYPES } from './problemTypes';
import { QUESTION_IDS, type FeedbackEntry, type ProblemType, type QuestionId, type Team } from '../types';

export interface FlaggedQuestion {
  key: string;
  team: Team;
  questionId: QuestionId;
  responseCount: number;
  pointedOutCount: number;
  comments: string[];
}

/** Each responding group counts once. Responses without feedback remain in the denominator. */
export function teacherFeedbackSummary(teams: Record<string, Team>) {
  const entries = Object.entries(teams);
  const responses = new Map<string, (FeedbackEntry | undefined)[]>();
  for (const [reviewerId, reviewer] of entries) {
    for (const [teamId, byQuestion] of Object.entries(reviewer.responsesGiven ?? {})) {
      if (reviewerId === teamId || !teams[teamId]) continue;
      for (const questionId of QUESTION_IDS) {
        if (!byQuestion[questionId] || !teams[teamId].questions?.[questionId]) continue;
        const key = `${teamId}_${questionId}`;
        const feedback = responses.get(key) ?? [];
        feedback.push(reviewer.feedbackGiven?.[teamId]?.[questionId]);
        responses.set(key, feedback);
      }
    }
  }
  const sortedTeams = entries.sort((a, b) => a[1].teamNumber - b[1].teamNumber);
  return PROBLEM_TYPES.filter((type) => type.id !== 'NONE').map((type) => {
    const questions: FlaggedQuestion[] = [];
    for (const [teamId, team] of sortedTeams) {
      for (const questionId of QUESTION_IDS) {
        if (!team.questions?.[questionId]) continue;
        const key = `${teamId}_${questionId}`;
        const respondents = responses.get(key) ?? [];
        const pointedOut = respondents.filter((entry): entry is FeedbackEntry => Boolean(entry?.problemTypes.includes(type.id)));
        // Integer comparison preserves the exact inclusive 30% boundary.
        if (!respondents.length || pointedOut.length * 10 < respondents.length * 3) continue;
        questions.push({
          key, team, questionId,
          responseCount: respondents.length, pointedOutCount: pointedOut.length,
          comments: pointedOut.map((entry) => entry.comment).filter(Boolean),
        });
      }
    }
    return { problemType: type.id as Exclude<ProblemType, 'NONE'>, questions };
  }).filter((entry) => entry.questions.length).sort((a, b) => b.questions.length - a.questions.length);
}
