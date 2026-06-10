
export type Phase =
  | 'connecting'
  | 'waiting_for_opponent'
  | 'pick_category'
  | 'waiting_for_category'
  | 'category_chosen'
  | 'question'
  | 'answered'
  | 'reveal'
  | 'round_result'
  | 'game_over'
  | 'opponent_disconnected'
  | 'error';