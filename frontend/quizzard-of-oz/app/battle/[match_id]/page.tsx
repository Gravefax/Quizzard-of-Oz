import BattleArena from '@/app/components/battle/BattleArena';

export default async function BattlePage({
  params,
}: {
  readonly params: Promise<{ match_id: string }>;
}) {
  const { match_id } = await params;
  return <BattleArena matchId={match_id} />;
}
