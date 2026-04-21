import { replicateConfigured } from "@/lib/ai/replicate";
import { prisma } from "@/lib/prisma";
import { AiClient } from "./AiClient";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const cards = await prisma.card.findMany({
    orderBy: [{ rarity: "desc" }, { eraId: "asc" }, { cost: "asc" }],
  });
  const configured = replicateConfigured();
  const withArt = cards.filter((c) => c.imageUrl).length;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <p className="font-[family-name:var(--font-cinzel)] text-blood/70 tracking-[0.35em] text-xs uppercase mb-1">
            AI Artisan
          </p>
          <h1 className="display-serif text-3xl text-parchment">卡面生成</h1>
          <p className="text-parchment/60 text-sm mt-1">
            Replicate Flux.1 Schnell · 每張約 $0.003
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-parchment/50">已生成</div>
          <div className="font-[family-name:var(--font-mono)] text-2xl text-parchment tabular-nums">
            {withArt} / {cards.length}
          </div>
        </div>
      </div>

      {!configured && (
        <div className="mb-6 p-5 rounded-xl border border-warning/60 bg-warning/10">
          <h2 className="display-serif text-lg text-warning mb-2">
            ⚠️ Replicate 未設定
          </h2>
          <ol className="text-sm text-parchment/80 space-y-1.5 list-decimal list-inside">
            <li>
              到{" "}
              <a
                className="text-gold underline"
                href="https://replicate.com/account/api-tokens"
                target="_blank"
                rel="noreferrer"
              >
                replicate.com/account/api-tokens
              </a>{" "}
              取得 token
            </li>
            <li>
              <code className="bg-black/40 px-2 py-0.5 rounded">
                railway variable set REPLICATE_API_TOKEN=r8_xxxx
              </code>
            </li>
            <li>重新部署後即可使用</li>
          </ol>
          <p className="mt-3 text-xs text-parchment/50">
            也可以用 fal.ai 或 Runware(價格相近)— 改 [src/lib/ai/replicate.ts](src/lib/ai/replicate.ts) 即可
          </p>
        </div>
      )}

      <AiClient cards={cards} enabled={configured} />
    </main>
  );
}
