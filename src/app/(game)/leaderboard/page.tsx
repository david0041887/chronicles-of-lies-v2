import { PageHeader } from "@/components/ui/PageHeader";
import { requireOnboarded } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { weaverLevel } from "@/lib/weaver";
import { LeaderboardClient, type LeaderboardData } from "./LeaderboardClient";

export const dynamic = "force-dynamic";

const TOP_N = 50;

export default async function LeaderboardPage() {
  const me = await requireOnboarded();

  // Three boards in parallel. Each query is bounded to TOP_N rows + the
  // composite indexes already in place keep them cheap. We also fetch
  // the current user's row separately for each board so the player
  // sees their own rank even when they're outside the top 50.
  const [
    topTower,
    topBelievers,
    topBosses,
    myTowerRun,
    myEraBosses,
  ] = await Promise.all([
    prisma.dungeonRun.findMany({
      where: { kind: "tower", highestLevel: { gt: 0 } },
      orderBy: [{ highestLevel: "desc" }, { totalClears: "desc" }],
      take: TOP_N,
      select: {
        userId: true,
        highestLevel: true,
        totalClears: true,
        user: {
          select: { username: true, totalBelievers: true, faction: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { totalBelievers: { gt: 0 } },
      orderBy: { totalBelievers: "desc" },
      take: TOP_N,
      select: {
        id: true,
        username: true,
        totalBelievers: true,
        faction: true,
      },
    }),
    prisma.eraProgress.groupBy({
      by: ["userId"],
      where: { bossCleared: true },
      _count: { eraId: true },
      orderBy: { _count: { eraId: "desc" } },
      take: TOP_N,
    }),
    prisma.dungeonRun.findUnique({
      where: { userId_kind: { userId: me.id, kind: "tower" } },
      select: { highestLevel: true, totalClears: true },
    }),
    prisma.eraProgress.count({
      where: { userId: me.id, bossCleared: true },
    }),
  ]);

  // Resolve usernames + factions for the boss board (groupBy doesn't
  // include the relation by itself).
  const bossUserIds = topBosses.map((b) => b.userId);
  const bossUsers =
    bossUserIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: bossUserIds } },
          select: { id: true, username: true, faction: true, totalBelievers: true },
        });
  const bossUserMap = new Map(bossUsers.map((u) => [u.id, u]));

  const data: LeaderboardData = {
    me: {
      userId: me.id,
      username: me.username,
    },
    tower: topTower.map((row, i) => ({
      rank: i + 1,
      userId: row.userId,
      username: row.user?.username ?? "?",
      faction: row.user?.faction ?? "weavers",
      level: weaverLevel(row.user?.totalBelievers ?? 0),
      primary: row.highestLevel,
      secondary: row.totalClears,
    })),
    believers: topBelievers.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.username,
      faction: u.faction,
      level: weaverLevel(u.totalBelievers),
      primary: u.totalBelievers,
    })),
    bosses: topBosses.map((b, i) => {
      const u = bossUserMap.get(b.userId);
      return {
        rank: i + 1,
        userId: b.userId,
        username: u?.username ?? "?",
        faction: u?.faction ?? "weavers",
        level: weaverLevel(u?.totalBelievers ?? 0),
        primary: b._count.eraId,
        secondary: 10, // total possible eras for context
      };
    }),
    mySnapshot: {
      towerHighest: myTowerRun?.highestLevel ?? 0,
      towerClears: myTowerRun?.totalClears ?? 0,
      believers: me.totalBelievers,
      bossesCleared: myEraBosses,
    },
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        eyebrow="Hall of Echoes"
        title="排行榜"
        subtitle="編織者議會的低語榜 — 每分鐘更新一次"
      />
      <LeaderboardClient data={data} />
    </main>
  );
}
