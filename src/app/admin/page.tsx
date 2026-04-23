import { prisma } from "@/lib/prisma";
import { grantCrystals, resetUserStats, toggleRole } from "./actions";
import { ReseedStagesButton } from "./ReseedStagesButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [users, stats] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        level: true,
        crystals: true,
        faith: true,
        battlesWon: true,
        battlesLost: true,
        totalBelievers: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    prisma.user.aggregate({
      _count: true,
      _sum: { crystals: true, totalBelievers: true, veilEnergy: true },
    }),
  ]);

  const adminCount = users.filter((u) => u.role === "ADMIN").length;

  const stageCount = await prisma.stage.count();

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-[family-name:var(--font-cinzel)] text-blood/70 tracking-[0.35em] text-xs uppercase mb-1">
            Council Chamber
          </p>
          <h1 className="display-serif text-3xl text-parchment">編織者議會 · 後台</h1>
        </div>
        <div className="flex gap-2">
          <ReseedStagesButton currentCount={stageCount} />
          <a
            href="/admin/ai"
            className="text-xs px-3 py-1.5 rounded border border-gold/50 text-gold hover:bg-gold/10 tracking-widest"
          >
            🎨 卡面生成
          </a>
          <span className="text-xs text-parchment/40 tracking-widest self-center">
            ADMIN
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Stat label="使用者總數" value={stats._count} />
        <Stat label="管理員" value={adminCount} tint="text-blood" />
        <Stat
          label="水晶總流通"
          value={stats._sum.crystals ?? 0}
          tint="text-rarity-super"
        />
        <Stat
          label="帷幕能量總和"
          value={stats._sum.veilEnergy ?? 0}
          tint="text-ichor"
        />
      </div>

      {/* Users table */}
      <section className="rounded-xl border border-parchment/10 bg-veil/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-parchment/10 flex items-center justify-between">
          <h2 className="display-serif text-lg text-sacred">使用者清單</h2>
          <span className="text-xs text-parchment/40">
            {users.length} 位編織者
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-parchment/50 tracking-wider border-b border-parchment/10">
                <th className="px-4 py-3">使用者</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3 text-right">Lv</th>
                <th className="px-4 py-3 text-right">💎</th>
                <th className="px-4 py-3 text-right">勝 / 負</th>
                <th className="px-4 py-3 text-right">信徒</th>
                <th className="px-4 py-3">建立</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-parchment/5 hover:bg-parchment/5"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-parchment">{u.username}</div>
                    <div className="text-xs text-parchment/40">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        u.role === "ADMIN"
                          ? "bg-blood/20 text-blood border border-blood/40"
                          : "bg-parchment/10 text-parchment/70"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] tabular-nums">
                    {u.level}
                  </td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] tabular-nums text-rarity-super">
                    {u.crystals.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] tabular-nums text-parchment/70">
                    {u.battlesWon} / {u.battlesLost}
                  </td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] tabular-nums">
                    {u.totalBelievers.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-parchment/50">
                    {u.createdAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <form action={toggleRole.bind(null, u.id)}>
                        <button
                          type="submit"
                          className="text-xs px-2 py-1 rounded border border-parchment/30 text-parchment/70 hover:border-gold hover:text-gold"
                          title="切換角色"
                        >
                          {u.role === "ADMIN" ? "降為玩家" : "升為管理員"}
                        </button>
                      </form>
                      <form action={grantCrystals.bind(null, u.id, 1000)}>
                        <button
                          type="submit"
                          className="text-xs px-2 py-1 rounded border border-rarity-super/50 text-rarity-super hover:bg-rarity-super/10"
                          title="贈送水晶"
                        >
                          +1000💎
                        </button>
                      </form>
                      <form action={resetUserStats.bind(null, u.id)}>
                        <button
                          type="submit"
                          className="text-xs px-2 py-1 rounded border border-blood/40 text-blood/80 hover:bg-blood/10"
                          title="歸零戰績"
                        >
                          重置
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-8 text-xs text-parchment/30 tracking-widest text-center">
        Phase 1.1 後台 — 更多管理功能(卡牌編輯、活動開關、封禁)於後續 phase 加入
      </p>
    </main>
  );
}

function Stat({
  label,
  value,
  tint = "text-parchment",
}: {
  label: string;
  value: number;
  tint?: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-parchment/10 bg-veil/40">
      <div className="text-xs text-parchment/50 tracking-wider">{label}</div>
      <div
        className={`font-[family-name:var(--font-mono)] text-2xl tabular-nums mt-1 ${tint}`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
