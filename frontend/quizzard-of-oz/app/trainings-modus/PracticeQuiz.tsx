'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchPracticeQuestions, checkPracticeAnswer } from '../lib/api/quiz';
import { AnswerResult, Question } from '../lib/interfaces/Questions';

type QuizState = 'idle' | 'loading' | 'playing' | 'answered' | 'finished' | 'error';

export default function PracticeQuiz() {
  const router = useRouter();
  const [state, setState] = useState<QuizState>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [score, setScore] = useState(0);

  async function startQuiz() {
    setState('loading');
    try {
      const data = await fetchPracticeQuestions();
      setQuestions(data);
      setCurrentIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setState('playing');
    } catch {
      setState('error');
    }
  }

  async function selectAnswer(answer: string) {
    if (state !== 'playing') return;
    setSelectedAnswer(answer);
    try {
      const result = await checkPracticeAnswer(questions[currentIndex].id, answer);
      setAnswerResult(result);
      if (result.correct) setScore(s => s + 1);
      setState('answered');
    } catch {
      setState('error');
    }
  }

  function nextQuestion() {
    const next = currentIndex + 1;
    if (next >= questions.length) {
      setState('finished');
    } else {
      setCurrentIndex(next);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setState('playing');
    }
  }

  function getScoreEmoji() {
    if (score === questions.length) return '🏆';
    if (score >= questions.length / 2) return '⭐';
    return '📖';
  }

  function getScoreMessage() {
    if (score === questions.length) return 'Perfekt! Alle Fragen richtig!';
    if (score >= questions.length / 2) return 'Gut gemacht! Weiter üben!';
    return 'Nicht aufgeben – Übung macht den Meister!';
  }

  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;
  const question = questions[currentIndex];

  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">

      {/* ── Idle ── */}
      {state === 'idle' && (
        <div className="flex flex-col items-center gap-8 text-center max-w-md">
          <div className="text-6xl" style={{ filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.5))' }}>📚</div>
          <div>
            <h1 className="text-4xl font-bold mb-3" style={{ color: '#ede9fe' }}>Übungsmodus</h1>
            <p className="text-sm" style={{ color: 'rgba(196,181,253,0.6)' }}>
              10 Fragen aus verschiedenen Kategorien – ohne Zeitdruck, ohne Druck.
            </p>
          </div>
          <button
            onClick={startQuiz}
            className="px-10 py-4 rounded-2xl font-semibold text-lg transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.8) 0%, rgba(99,102,241,0.8) 100%)',
              border: '1px solid rgba(167,139,250,0.4)',
              color: '#ede9fe',
              boxShadow: '0 8px 32px rgba(139,92,246,0.3)',
            }}
          >
            Quiz starten
          </button>
          <button
            onClick={() => router.push('/')}
            className="text-sm"
            style={{ color: 'rgba(196,181,253,0.4)' }}
          >
            ← Zurück zur Startseite
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {state === 'loading' && (
        <div className="text-center" style={{ color: 'rgba(196,181,253,0.6)' }}>
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <p>Fragen werden geladen…</p>
        </div>
      )}

      {/* ── Error ── */}
      {state === 'error' && (
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <div className="text-5xl">⚠️</div>
          <div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#fca5a5' }}>Verbindungsfehler</h2>
            <p className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>
              Der Server ist nicht erreichbar. Stelle sicher, dass das Backend läuft.
            </p>
          </div>
          <button
            onClick={startQuiz}
            className="px-8 py-3 rounded-xl text-sm font-medium"
            style={{
              background: 'rgba(139,92,246,0.2)',
              border: '1px solid rgba(167,139,250,0.3)',
              color: '#ede9fe',
            }}
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* ── Playing / Answered ── */}
      {(state === 'playing' || state === 'answered') && question && (
        <div className="w-full max-w-xl flex flex-col gap-6">

          {/* Progress */}
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'rgba(196,181,253,0.5)' }}>
            <span>Frage {currentIndex + 1} / {questions.length}</span>
            <span style={{ color: 'rgba(245,158,11,0.7)' }}>{score} richtig</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: '4px', background: 'rgba(167,139,250,0.15)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #7c3aed, #6366f1)',
              }}
            />
          </div>

          {/* Question card */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(167,139,250,0.2)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              className="text-xs font-medium uppercase tracking-widest mb-3"
              style={{ color: 'rgba(245,158,11,0.6)', letterSpacing: '0.2em' }}
            >
              {question.category}
            </div>
            <p className="text-lg font-medium leading-relaxed" style={{ color: '#ede9fe' }}>
              {question.text}
            </p>
          </div>

          {/* Answer options */}
          <div className="grid grid-cols-1 gap-3">
            {question.answers.map((answer) => {
              let borderColor = 'rgba(167,139,250,0.2)';
              let bg = 'rgba(255,255,255,0.03)';
              let textColor = 'rgba(237,233,254,0.85)';

              if (state === 'answered') {
                if (answer === answerResult?.correct_answer) {
                  borderColor = 'rgba(52,211,153,0.6)';
                  bg = 'rgba(52,211,153,0.1)';
                  textColor = '#6ee7b7';
                } else if (answer === selectedAnswer && !answerResult?.correct) {
                  borderColor = 'rgba(248,113,113,0.6)';
                  bg = 'rgba(248,113,113,0.1)';
                  textColor = '#fca5a5';
                }
              }

              return (
                <button
                  key={answer}
                  onClick={() => selectAnswer(answer)}
                  disabled={state === 'answered'}
                  className="rounded-xl px-5 py-4 text-left text-sm font-medium transition-all duration-200"
                  style={{
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    color: textColor,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {answer}
                </button>
              );
            })}
          </div>

          {/* Feedback + next – Platz immer reserviert, kein Layout-Shift */}
          <div className="flex flex-col items-center gap-4" style={{ minHeight: '88px' }}>
            <p
              className="text-sm font-medium"
              style={{
                color: answerResult?.correct ? '#6ee7b7' : '#fca5a5',
                opacity: state === 'answered' && answerResult ? 1 : 0,
                transition: 'opacity 0.2s ease',
              }}
            >
              {answerResult?.correct ? '✓ Richtig!' : `✗ Falsch – richtig wäre: ${answerResult?.correct_answer}`}
            </p>
            <button
              onClick={nextQuestion}
              className="px-8 py-3 rounded-xl font-medium text-sm transition-all duration-200"
              style={{
                background: 'rgba(139,92,246,0.25)',
                border: '1px solid rgba(167,139,250,0.4)',
                color: '#ede9fe',
                opacity: state === 'answered' ? 1 : 0,
                pointerEvents: state === 'answered' ? 'auto' : 'none',
                transition: 'opacity 0.2s ease',
              }}
            >
              {currentIndex + 1 < questions.length ? 'Nächste Frage →' : 'Ergebnis anzeigen →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Finished ── */}
      {state === 'finished' && (
        <div className="flex flex-col items-center gap-8 text-center max-w-md">
          <div className="text-6xl" style={{ filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.5))' }}>
            {getScoreEmoji()}
          </div>
          <div>
            <h2 className="text-4xl font-bold mb-2" style={{ color: '#ede9fe' }}>
              {score} / {questions.length}
            </h2>
            <p className="text-sm" style={{ color: 'rgba(196,181,253,0.6)' }}>
              {getScoreMessage()}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={startQuiz}
              className="px-10 py-4 rounded-2xl font-semibold transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.8) 0%, rgba(99,102,241,0.8) 100%)',
                border: '1px solid rgba(167,139,250,0.4)',
                color: '#ede9fe',
                boxShadow: '0 8px 32px rgba(139,92,246,0.3)',
              }}
            >
              Nochmal spielen
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-sm py-2"
              style={{ color: 'rgba(196,181,253,0.4)' }}
            >
              ← Zurück zur Startseite
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
