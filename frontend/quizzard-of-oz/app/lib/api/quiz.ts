import axios from 'axios';
import { AnswerResult, Question } from "../interfaces/Questions";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export async function fetchPracticeQuestions(): Promise<Question[]> {
  try {
    const res = await axios.get<Question[]>(`${API_BASE}/quiz/practice/questions`);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch questions: ${error.response?.status ?? 'unknown'}`);
    }
    throw error;
  }
}

export async function checkPracticeAnswer(
  question_id: string,
  answer: string,
): Promise<AnswerResult> {
  try {
    const res = await axios.post<AnswerResult>(`${API_BASE}/quiz/practice/answer`, {
      question_id,
      answer,
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to check answer: ${error.response?.status ?? 'unknown'}`);
    }
    throw error;
  }
}
