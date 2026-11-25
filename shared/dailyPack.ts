/**
 * The daily pack: Claude writes a fresh Quiz ABC and an Incident every Bureau day, in Polish and English.
 * The full versions (with the punchlines and which answer is "approved") stay on the server;
 * players get the public versions and learn each outcome only after they commit to an answer.
 */

export const LETTERS = ['A', 'B', 'C'] as const;
export type Letter = (typeof LETTERS)[number];

export interface QuizAnswer {
  letter: Letter;
  text: string;
  /** The absurd punchline shown after picking this answer. */
  outcome: string;
  /** Exactly one per question is "Bureau-approved" (worth bonus XP), in the most absurd sense. */
  approved: boolean;
}

export interface QuizQuestion {
  question: string;
  answers: QuizAnswer[];
}

export interface Verdict {
  title: string;
  text: string;
}

export interface Quiz {
  title: string;
  intro: string;
  questions: QuizQuestion[];
  /** The final "agent profile" by the letter picked most, and one for a perfect mix. */
  verdicts: Record<Letter | 'mixed', Verdict>;
}

export interface IncidentChoice {
  label: string;
  outcome: string;
  ending_title: string;
  xp: number;
}

export interface Incident {
  title: string;
  /** Which tale the report comes from (a TALES id) or null for Bureau HQ. */
  tale_id: string | null;
  report: string;
  choices: IncidentChoice[];
  signoff: string;
}

export type PublicQuiz = Omit<Quiz, 'questions' | 'verdicts'> & { questions: { question: string; answers: { letter: Letter; text: string }[] }[] };
export type PublicIncident = Omit<Incident, 'choices' | 'signoff'> & { choices: { label: string }[] };

export const publicQuiz = (q: Quiz): PublicQuiz => ({
  title: q.title,
  intro: q.intro,
  questions: q.questions.map((x) => ({ question: x.question, answers: x.answers.map(({ letter, text }) => ({ letter, text })) })),
});
export const publicIncident = (i: Incident): PublicIncident => ({
  title: i.title,
  tale_id: i.tale_id,
  report: i.report,
  choices: i.choices.map(({ label }) => ({ label })),
});

/** The verdict for a set of answers: the letter picked most, or "mixed" when there is no single winner. */
export function verdictKey(picks: Letter[]): Letter | 'mixed' {
  const counts = LETTERS.map((l) => picks.filter((p) => p === l).length);
  const max = Math.max(...counts);
  const winners = LETTERS.filter((_, i) => counts[i] === max);
  return winners.length === 1 ? winners[0] : 'mixed';
}

/** What a player's quiz looks like after each answer. */
export interface QuizState {
  quiz: PublicQuiz;
  answers: { letter: Letter; outcome: string; approved: boolean; xp: number }[];
  verdict: Verdict | null;
  xp: number;
}

export interface IncidentState {
  incident: PublicIncident;
  result: { choice: number; outcome: string; ending_title: string; signoff: string; xp: number } | null;
}
