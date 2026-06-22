export interface Question {
  id: string;
  text: string;
  answers: string[];
  category: string;
}

export interface AnswerResult {
  correct: boolean;
  correct_answer: string;
}
