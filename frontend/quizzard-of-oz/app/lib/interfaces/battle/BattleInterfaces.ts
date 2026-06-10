export interface RoundResultData {
  round:               number;
  outcome:             'win' | 'loss' | 'tie';
  yourScore:           number;
  opponentScore:       number;
  yourTotalWins:       number;
  opponentTotalWins:   number;
  nextPicker:          string;
  gameOver:            boolean;
}

export interface PlayerInfo {
  yourUsername:     string;
  opponentUsername: string;
  youPickFirst:     boolean;
  roundsToWin:      number;
}

export interface ScoreInfo {
  yourWins:     number;
  opponentWins: number;
}

export interface QuestionData {
  questionNumber: number;
  totalQuestions: number;
  questionId:     string;
  text:           string;
  answers:        string[];
  category:       string;
}

export interface AnswerResultData {
  correct:            boolean;
  correctAnswer:      string;
  yourAnswer:         string;
  yourScoreThisRound: number;
}



export interface GameOverData {
  winner:        string;
  youWon:        boolean;
  yourWins:      number;
  opponentWins:  number;
  forfeit?:      boolean;
  message?:      string;
}

export interface RoundOutcomeMeta {
  color: string;
  cssClass: string;
  label: string;
}