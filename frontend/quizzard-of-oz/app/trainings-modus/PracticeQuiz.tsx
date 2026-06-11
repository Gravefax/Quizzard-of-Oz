'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchPracticeQuestions, checkPracticeAnswer } from '../lib/api/quiz';
import { AnswerResult, Question } from '../lib/interfaces/Questions';
import practiceStyles from './practice.module.css';

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
    <div className="flex-1 flex flex-col relative overflow-hidden">

      {/* ── Background layer ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">

        {/* Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,200,0,0.022) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,200,0,0.022) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
          }}
        />

        {/* Scan line */}
        <div
          className="absolute left-0 right-0"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.12) 40%, rgba(255,200,0,0.12) 60%, transparent 100%)',
            animation: 'scanDown 11s linear 0.8s infinite',
          }}
        />

        {/* Gold orb — left */}
        <div
          className="absolute"
          style={{
            width: '620px', height: '620px',
            top: '5%', left: '-18%',
            background: 'radial-gradient(circle, rgba(255,200,0,0.05) 0%, transparent 65%)',
            animation: 'ambFloat0 14s ease-in-out infinite',
          }}
        />

        {/* Cyan orb — right */}
        <div
          className="absolute"
          style={{
            width: '500px', height: '500px',
            top: '8%', right: '-12%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 65%)',
            animation: 'ambFloat1 12s ease-in-out 1.5s infinite',
          }}
        />

        {/* Center depth orb — adapts to theme */}
        <div
          className="absolute"
          style={{
            width: '500px', height: '500px',
            top: '50%', left: '50%',
            background: 'radial-gradient(circle, rgba(255,200,0,0.03) 0%, rgba(var(--oz-depth-bg-rgb),0.25) 55%, transparent 100%)',
            animation: 'orbPulse 7s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Persistent back button ── */}
      <button
        className="back-btn absolute top-6 left-6 z-10 px-4 py-2 text-sm flex items-center gap-1.5"
        onClick={() => router.push('/')}
      >
        ← Zurück
      </button>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">

        {/* ── Idle ── */}
        {state === 'idle' && (
          <div className={`${practiceStyles['practice-card']} flex flex-col items-center gap-8 px-10 py-10 w-full max-w-md`}>
            <div
              style={{
                fontSize: '3rem',
                filter: 'drop-shadow(0 0 20px rgba(255,200,0,0.55))',
              }}
            >
              🎯
            </div>
            <div>
              <h1 className="arena-title" style={{ fontSize: '3rem' }}>Übungsmodus</h1>
              <span className={practiceStyles['neon-line-gold']} />
              <p className="text-sm mt-3" style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.65)' }}>
                10 Fragen aus verschiedenen Kategorien – ohne Zeitdruck, ohne Druck.
              </p>
            </div>
            <button className={practiceStyles['practice-btn-primary']} onClick={startQuiz}>
              Quiz starten
            </button>
          </div>
        )}

        {/* ── Loading ── */}
        {state === 'loading' && (
          <div className="text-center" style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.7)' }}>
            <div
              className="text-4xl mb-4 animate-pulse"
              style={{ filter: 'drop-shadow(0 0 14px rgba(255,200,0,0.5))' }}
            >
              ⏳
            </div>
            <p
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                letterSpacing: '0.1em',
                fontSize: '1.1rem',
                color: 'rgba(255,200,0,0.7)',
              }}
            >
              Fragen werden geladen…
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {state === 'error' && (
          <div className={`${practiceStyles['practice-card']} flex flex-col items-center gap-6 px-8 py-8 w-full max-w-sm`}>
            <div className="text-5xl">⚠️</div>
            <div>
              <h2 className="arena-title" style={{ fontSize: '2rem', color: '#fca5a5' }}>
                Verbindungsfehler
              </h2>
              <p className="text-sm mt-2" style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.65)' }}>
                Der Server ist nicht erreichbar. Stelle sicher, dass das Backend läuft.
              </p>
            </div>
            <button
              onClick={startQuiz}
              className="px-8 py-3 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: 'rgba(255,200,0,0.1)',
                border: '1px solid rgba(255,200,0,0.3)',
                color: 'rgba(200,140,0,0.9)',
              }}
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* ── Playing / Answered ── */}
        {(state === 'playing' || state === 'answered') && question && (
          <div className="w-full max-w-xl flex flex-col gap-6">

            {/* Progress header */}
            <div
              className="flex items-center justify-between text-xs mb-1"
              style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.6)' }}
            >
              <span>Frage {currentIndex + 1} / {questions.length}</span>
              <span style={{ color: 'rgba(255,200,0,0.8)' }}>{score} richtig</span>
            </div>

            {/* Progress bar */}
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: '4px', background: 'rgba(255,200,0,0.1)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, rgba(255,200,0,0.8), rgba(0,212,255,0.7))',
                }}
              />
            </div>

            {/* Question card */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(var(--oz-card-bg-rgb),0.78)',
                border: '1px solid rgba(255,200,0,0.16)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <div
                className="text-xs font-medium uppercase mb-3"
                style={{ color: 'rgba(255,200,0,0.6)', letterSpacing: '0.2em' }}
              >
                {question.category}
              </div>
              <p
                className="text-lg font-medium leading-relaxed"
                style={{ color: 'rgba(var(--oz-text-bright-rgb),0.92)' }}
              >
                {question.text}
              </p>
            </div>

            {/* Answer options */}
            <div className="grid grid-cols-1 gap-3">
              {question.answers.map((answer) => {
                let borderColor = 'rgba(255,200,0,0.16)';
                let bg = 'rgba(var(--oz-card-bg-rgb),0.45)';
                let textColor = 'rgba(var(--oz-text-primary-rgb),0.85)';

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
                    className={practiceStyles['practice-answer-btn']}
                    style={{
                      background: bg,
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                    }}
                  >
                    {answer}
                  </button>
                );
              })}
            </div>

            {/* Feedback + next */}
            <div className="flex flex-col items-center gap-4" style={{ minHeight: '88px' }}>
              <p
                className="text-sm font-medium"
                style={{
                  color: answerResult?.correct ? '#6ee7b7' : '#fca5a5',
                  opacity: state === 'answered' && answerResult ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                }}
              >
                {answerResult?.correct
                  ? '✓ Richtig!'
                  : `✗ Falsch – richtig wäre: ${answerResult?.correct_answer}`}
              </p>
              <button
                onClick={nextQuestion}
                className="px-8 py-3 rounded-xl font-medium text-sm transition-all duration-200"
                style={{
                  background: 'rgba(255,200,0,0.13)',
                  border: '1px solid rgba(255,200,0,0.35)',
                  color: 'rgba(200,140,0,0.95)',
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
          <div className={`${practiceStyles['practice-card']} flex flex-col items-center gap-8 px-10 py-10 w-full max-w-md`}>
            <div
              className="text-6xl"
              style={{ filter: 'drop-shadow(0 0 24px rgba(255,200,0,0.55))' }}
            >
              {getScoreEmoji()}
            </div>
            <div>
              <h2 className="arena-title" style={{ fontSize: '4.5rem' }}>
                {score} / {questions.length}
              </h2>
              <span className={practiceStyles['neon-line-gold']} />
              <p className="text-sm mt-3" style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.7)' }}>
                {getScoreMessage()}
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <button className={`${practiceStyles['practice-btn-primary']} w-full`} onClick={startQuiz}>
                Nochmal spielen
              </button>
              <button
                onClick={() => router.push('/')}
                className="text-sm py-2"
                style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.45)' }}
              >
                ← Zur Startseite
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
