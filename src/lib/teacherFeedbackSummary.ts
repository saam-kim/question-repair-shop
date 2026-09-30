import { PROBLEM_TYPES } from './problemTypes';
import { QUESTION_IDS, type ProblemType, type QuestionId, type Team } from '../types';

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
  return PROBLEM_TYPES.filter((type) => type.id !== 'NONE').map((type) => {
    const questions: FlaggedQuestion[] = [];
    for (const [teamId, team] of Object.entries(teams).sort((a, b) => a[1].teamNumber - b[1].teamNumber)) {
      for (const questionId of QUESTION_IDS) {
        if (!team.questions?.[questionId]) continue;
        const respondents = Object.entries(teams).filter(([id, reviewer]) =>
          id !== teamId && reviewer.responsesGiven?.[teamId]?.[questionId] !== undefined,
        );
        const pointedOut = respondents.filter(([, reviewer]) =>
          reviewer.feedbackGiven?.[teamId]?.[questionId]?.problemTypes.includes(type.id),
        );
        // Integer comparison preserves the exact inclusive 30% boundary.
        if (!respondents.length || pointedOut.length * 10 < respondents.length * 3) continue;
        questions.push({
          key: `${teamId}_${questionId}`, team, questionId,
          responseCount: respondents.length, pointedOutCount: pointedOut.length,
          comments: pointedOut.map(([, reviewer]) => reviewer.feedbackGiven?.[teamId]?.[questionId]?.comment ?? '').filter(Boolean),
        });
      }
    }
    return { problemType: type.id as Exclude<ProblemType, 'NONE'>, questions };
  }).filter((entry) => entry.questions.length).sort((a, b) => b.questions.length - a.questions.length);
}
