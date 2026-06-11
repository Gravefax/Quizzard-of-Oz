'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AnswerResultData,
  GameOverData,
  PlayerInfo,
  QuestionData,
  RoundResultData,
  ScoreInfo,
} from '@/app/lib/interfaces/battle/BattleInterfaces';
import { Phase } from '@/app/lib/interfaces/battle/Phase';
import { BATTLE_ARENA_STYLES } from './BattleArena.styles';
import { BattleArenaHeader } from './BattleArenaHeader';
import {
  ConnectingPhase,
  WaitingForOpponentPhase,
  CategoryChosenPhase,
  OpponentDisconnectedPhase,
  ErrorPhase,
} from './phases/SimplePhases';
import { PickCategoryPhase, WaitingForCategoryPhase } from './phases/CategoryPhases';
import { QuestionPhase } from './phases/QuestionPhase';
import { RoundResultPhase, GameOverPhase } from './phases/ResultPhases';
import { getWsUrl } from '@/app/lib/utils/wsUrl';
import useAuthStore from '@/app/stores/authStore';

interface BattleArenaProps {
  readonly matchId: string;
}

/**
 * BattleArena Component
 *
 * Main orchestrator component for the battle/quiz arena. Manages all battle phases,
 * WebSocket communication, and state transitions.
 *
 * ### Battle Flow:
 * 1. **Connecting** → WebSocket connection established
 * 2. **Waiting for Opponent** → Second player joins
 * 3. **Match Ready** → Both players present, rounds begin
 * 4. **Pick Category** → Current picker selects category (3 per round)
 * 5. **Waiting for Category** → Opponent selecting
 * 6. **Category Chosen** → Animation showing selected category
 * 7. **Question** → Answer-selection phase (up to 3 per round, 20s each)
 * 8. **Answered** → Waiting for opponent to finish their answer
 * 9. **Round Result** → Score comparison and next picker announcement
 * 10. **Game Over** → Winner and final scores (first to 3 wins)
 *
 * ### WebSocket Message Types (incoming):
 * - `waiting_for_opponent` → Waiting phase
 * - `match_ready` → Game start
 * - `pick_category` → Choose category
 * - `waiting_for_category` → Opponent choosing
 * - `category_chosen` → Category display
 * - `question` → New question
 * - `answer_result` → Feedback on answer
 * - `round_result` → End of round
 * - `game_over` → Battle complete
 * - `opponent_disconnected` → Opponent left
 *
 * ### WebSocket Message Types (outgoing):
 * - `pick_category: { category: string }` → Submit category choice
 * - `answer: { question_id: string, answer: string }` → Submit answer
 */
export default function BattleArena({ matchId }: BattleArenaProps) {
  const router = useRouter();
  const credential = useAuthStore((state) => state.credential);

  // ── Battle State ──
  const [phase, setPhase] = useState<Phase>('connecting');
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [scores, setScores] = useState<ScoreInfo>({ yourWins: 0, opponentWins: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [chosenCategory, setChosenCategory] = useState('');
  const [currentRound, setCurrentRound] = useState(1);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResultData | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResultData | null>(null);
  const [gameOver, setGameOver] = useState<GameOverData | null>(null);
  const [nextPicker, setNextPicker] = useState('');
  const [timeLeft, setTimeLeft] = useState(20);
  const [errorMsg, setErrorMsg] = useState('');
  const [pickerName, setPickerName] = useState('');

  // ── Refs for WebSocket & Timer ──
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>('connecting');
  const hadCredentialRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ── Logout During Match ──
  // Leaving the page unmounts this component, which closes the WebSocket and
  // lets the server forfeit the match to the opponent. Logging out only clears
  // the credential, so we navigate away explicitly once a previously present
  // credential disappears.
  useEffect(() => {
    if (credential) {
      hadCredentialRef.current = true;
      return;
    }
    if (hadCredentialRef.current) {
      router.push('/');
    }
  }, [credential, router]);

  // ── Timer Management ──

  /**
   * Starts a countdown timer for question answering (usually 20 seconds).
   *
   * @param seconds - Duration in seconds
   */
  function startTimer(seconds: number) {
    setTimeLeft(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  /**
   * Stops and clears the active timer.
   */
  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ── WebSocket Communication ──

  /**
   * Sends a message to the backend via WebSocket.
   *
   * @param data - Object to serialize and send
   */
  const send = useCallback((data: object) => {
    wsRef.current?.send(JSON.stringify(data));
  }, []);

  /**
   * WebSocket connection setup and message handler.
   * Processes all incoming server messages and updates state accordingly.
   */
  useEffect(() => {
    const ws = new WebSocket(getWsUrl(`/battle/ws/${matchId}`));
    wsRef.current = ws;
    let intentionalClose = false;

    ws.onmessage = (event: MessageEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg: Record<string, any> = JSON.parse(event.data as string);

      switch (msg.type) {
        case 'waiting_for_opponent':
          setPhase('waiting_for_opponent');
          break;

        case 'match_ready':
          setPlayer({
            yourUsername: msg.your_username,
            opponentUsername: msg.opponent_username,
            youPickFirst: msg.you_pick_first,
            roundsToWin: msg.rounds_to_win,
          });
          setScores({ yourWins: 0, opponentWins: 0 });
          break;

        case 'pick_category':
          stopTimer();
          setCategories(msg.categories as string[]);
          setCurrentRound(msg.round as number);
          setScores({
            yourWins: msg.your_wins as number,
            opponentWins: msg.opponent_wins as number,
          });
          setPhase('pick_category');
          break;

        case 'waiting_for_category':
          stopTimer();
          setCurrentRound(msg.round as number);
          setScores({
            yourWins: msg.your_wins as number,
            opponentWins: msg.opponent_wins as number,
          });
          setPickerName(msg.picker_username as string);
          setPhase('waiting_for_category');
          break;

        case 'category_chosen':
          setChosenCategory(msg.category as string);
          setPhase('category_chosen');
          break;

        case 'question':
          stopTimer();
          setQuestion({
            questionNumber: msg.question_number as number,
            totalQuestions: msg.total_questions as number,
            questionId: msg.question_id as string,
            text: msg.text as string,
            answers: msg.answers as string[],
            category: msg.category as string,
          });
          setSelectedAnswer(null);
          setAnswerResult(null);
          setPhase('question');
          startTimer(20);
          break;

        case 'answer_result':
          stopTimer();
          setAnswerResult({
            correct: msg.correct as boolean,
            correctAnswer: msg.correct_answer as string,
            yourScoreThisRound: msg.your_score_this_round as number,
          });
          setPhase('answered');
          break;

        case 'round_result':
          stopTimer();
          setRoundResult({
            round: msg.round as number,
            outcome: msg.outcome as 'win' | 'loss' | 'tie',
            yourScore: msg.your_score as number,
            opponentScore: msg.opponent_score as number,
            yourTotalWins: msg.your_total_wins as number,
            opponentTotalWins: msg.opponent_total_wins as number,
            nextPicker: msg.next_picker as string,
            gameOver: msg.game_over as boolean,
          });
          setScores({
            yourWins: msg.your_total_wins as number,
            opponentWins: msg.opponent_total_wins as number,
          });
          setNextPicker(msg.next_picker as string);
          setPhase('round_result');
          break;

        case 'game_over':
          stopTimer();
          setGameOver({
            winner: msg.winner as string,
            youWon: msg.you_won as boolean,
            yourWins: msg.your_wins as number,
            opponentWins: msg.opponent_wins as number,
          });
          setPhase('game_over');
          break;

        case 'opponent_forfeit':
          stopTimer();
          setGameOver({
            winner: msg.winner as string,
            youWon: true,
            yourWins: msg.your_wins as number,
            opponentWins: msg.opponent_wins as number,
            forfeit: true,
            message: msg.message as string,
          });
          setPhase('game_over');
          break;

        case 'opponent_disconnected':
          stopTimer();
          setPhase('opponent_disconnected');
          break;
      }
    };

    ws.onclose = (event: CloseEvent) => {
      if (intentionalClose) return;
      if (phaseRef.current === 'game_over' || phaseRef.current === 'opponent_disconnected') return;
      if (event.code === 4001 || event.code === 4003) {
        setErrorMsg('Login erforderlich.');
        setPhase('error');
      } else if (event.code !== 1000) {
        setErrorMsg('Verbindung unterbrochen.');
        setPhase('error');
      }
    };

    return () => {
      stopTimer();
      intentionalClose = true;
      ws.close();
    };
     
  }, [matchId]);

  // ── User Actions ──

  /**
   * Sends selected category to the backend.
   *
   * @param cat - Category name
   */
  function pickCategory(cat: string) {
    send({ type: 'pick_category', category: cat });
  }

  /**
   * Submits an answer for the current question.
   * Prevents double submission by checking `selectedAnswer`.
   *
   * @param answer - Answer text
   */
  function submitAnswer(answer: string) {
    if (!question || selectedAnswer) return;
    setSelectedAnswer(answer);
    send({ type: 'answer', question_id: question.questionId, answer });
  }

  /**
   * Navigates back to the main lobby/home page.
   */
  function returnToLobby() {
    router.push('/');
  }

  // ── Render ──

  return (
    <>
      <style>{BATTLE_ARENA_STYLES}</style>

      <div className="arena-wrap">
        <div className="scan-line" />
        <div className="corner-tl" />
        <div className="corner-tr" />
        <div className="corner-bl" />
        <div className="corner-br" />

        {/* ── Score Header ── */}
        <BattleArenaHeader
          player={player}
          scores={scores}
          currentRound={currentRound}
          shouldShow={phase !== 'connecting' && phase !== 'waiting_for_opponent'}
        />

        {/* ── Battle Phases ── */}
        <div className="arena-body">
          {phase === 'connecting' && <ConnectingPhase />}

          {phase === 'waiting_for_opponent' && <WaitingForOpponentPhase />}

          {phase === 'pick_category' && (
            <PickCategoryPhase categories={categories} onCategoryPicked={pickCategory} />
          )}

          {phase === 'waiting_for_category' && <WaitingForCategoryPhase pickerName={pickerName} />}

          {phase === 'category_chosen' && <CategoryChosenPhase category={chosenCategory} />}

          {(phase === 'question' || phase === 'answered') && question && (
            <QuestionPhase
              question={question}
              timeLeft={timeLeft}
              selectedAnswer={selectedAnswer}
              answerResult={answerResult}
              isAnswered={phase === 'answered'}
              onSubmitAnswer={submitAnswer}
            />
          )}

          {phase === 'round_result' && roundResult && player && (
            <RoundResultPhase roundResult={roundResult} player={player} nextPicker={nextPicker} />
          )}

          {phase === 'game_over' && gameOver && player && (
            <GameOverPhase gameOver={gameOver} player={player} onReturnToLobby={returnToLobby} />
          )}

          {phase === 'opponent_disconnected' && (
            <OpponentDisconnectedPhase onReturnToLobby={returnToLobby} />
          )}

          {phase === 'error' && <ErrorPhase errorMessage={errorMsg} onReturnToLobby={returnToLobby} />}
        </div>
      </div>
    </>
  );
}
