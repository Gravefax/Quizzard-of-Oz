'use client';

import { AnswerResultData, QuestionData } from '@/app/lib/interfaces/battle/BattleInterfaces';
import { answerTextColor } from '../BattleArena.utils';

/**
 * QuestionPhase Component
 *
 * Displays a single quiz question with 4 answer options and a 20-second timer.
 * Players can click an answer button to submit their choice.
 *
 * After submitting, a "Warte auf Gegner…" spinner is shown — the solution stays
 * hidden until both players answered or the server deadline expired. Only then
 * the reveal phase highlights the correct answer for both players simultaneously;
 * the server advances to the next question automatically afterwards.
 *
 * Features:
 * - Timer bar that changes color when < 5 seconds
 * - Question number and category info
 * - Four answer buttons labeled A-D
 * - Visual feedback for correct/incorrect selections during reveal
 * - Disables buttons after selection or reveal to prevent double-submission
 */
interface QuestionPhaseProps {
  readonly question: QuestionData;
  readonly timeLeft: number;
  readonly selectedAnswer: string | null;
  readonly answerResult: AnswerResultData | null;
  readonly isAnswered: boolean;
  readonly isRevealed: boolean;
  readonly onSubmitAnswer: (answer: string) => void;
}

export function QuestionPhase({
  question,
  timeLeft,
  selectedAnswer,
  answerResult,
  isAnswered,
  isRevealed,
  onSubmitAnswer,
}: QuestionPhaseProps) {
  return (
    <div className="flex flex-col gap-5 w-full max-w-lg reveal">
      {/* ── Question Header ── */}
      <div className="flex items-center justify-between">
        {/* Category & Question Number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              background: 'rgba(255,60,20,0.1)',
              border: '1px solid rgba(255,60,20,0.3)',
              borderRadius: '6px',
              padding: '2px 8px',
              color: 'rgba(255,130,80,0.8)',
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              fontWeight: 700,
            }}
          >
            {question.category.toUpperCase()}
          </div>
          <div style={{ color: 'rgba(140,200,230,0.38)', fontSize: '0.68rem', letterSpacing: '0.1em' }}>
            {question.questionNumber} / {question.totalQuestions}
          </div>
        </div>

        {/* Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.4rem',
              letterSpacing: '0.1em',
              color: timeLeft <= 5 ? 'rgba(255,60,20,0.9)' : 'rgba(0,212,255,0.7)',
            }}
          >
            {timeLeft}
          </div>
        </div>
      </div>

      {/* ── Timer Bar ── */}
      <div className="timer-bar-track">
        <div
          className="timer-bar-fill"
          style={{
            width: `${(timeLeft / 20) * 100}%`,
            background:
              timeLeft <= 5
                ? 'linear-gradient(90deg, rgba(255,60,20,0.9), rgba(255,100,40,0.9))'
                : 'linear-gradient(90deg, rgba(0,212,255,0.8), rgba(0,180,220,0.8))',
          }}
        />
      </div>

      {/* ── Question Text ── */}
      <div className="arena-card" style={{ padding: '20px 24px' }}>
        <div
          style={{
            fontSize: '1.05rem',
            fontWeight: 500,
            lineHeight: 1.55,
            color: 'rgba(220,235,248,0.9)',
          }}
        >
          {question.text}
        </div>
      </div>

      {/* ── Answer Options ── */}
      <div className="flex flex-col gap-2.5">
        {question.answers.map((ans, i) => {
          const keys = ['A', 'B', 'C', 'D'];
          const isSelected = selectedAnswer === ans;
          const showResult = isRevealed && answerResult;
          const isCorrect = showResult && ans === answerResult?.correctAnswer;
          const isWrong = showResult && isSelected && !answerResult?.correct;

          return (
            <button
              key={ans}
              className={`answer-btn ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
              disabled={!!selectedAnswer || isRevealed}
              onClick={() => onSubmitAnswer(ans)}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className="answer-key">{keys[i]}</span>
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: answerTextColor(!!isCorrect, !!isWrong),
                }}
              >
                {ans}
              </span>
              {isCorrect && (
                <span style={{ marginLeft: 'auto', color: 'rgba(0,255,120,0.8)', fontSize: '1rem' }}>✓</span>
              )}
              {isWrong && (
                <span style={{ marginLeft: 'auto', color: 'rgba(255,90,50,0.8)', fontSize: '1rem' }}>✗</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Waiting for Opponent (solution still hidden) ── */}
      {isAnswered && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            color: 'rgba(140,200,230,0.4)',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
          }}
        >
          <div
            aria-label="Warte auf Gegner"
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: '2px solid rgba(0,212,255,0.2)',
              borderTopColor: 'rgba(0,212,255,0.8)',
              animation: 'spinSlow 0.9s linear infinite',
            }}
          />
          <span>Warte auf Gegner...</span>
        </div>
      )}

      {/* ── Reveal Status ── */}
      {isRevealed && answerResult && (
        <div
          style={{
            textAlign: 'center',
            color: 'rgba(140,200,230,0.4)',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
          }}
        >
          {(() => {
            if (answerResult.correct) return '✓ Richtig!';
            if (!selectedAnswer) return '⏱ Zeit abgelaufen.';
            return '✗ Falsch.';
          })()}{' '}
          Nächste Frage gleich...
        </div>
      )}
    </div>
  );
}
