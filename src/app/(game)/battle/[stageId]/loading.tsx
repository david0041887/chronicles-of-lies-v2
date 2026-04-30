import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Battle prep skeleton — drawn full-bleed because BattleClient itself is
 * a fixed-position overlay. The dim gradient + spinning arena hint tells
 * the player "the fight is loading" without showing layout that the
 * battle screen will paint over a moment later.
 */
export default function BattleLoading() {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6 bg-gradient-to-b from-[#0A0612] via-[#180826] to-[#030107]">
      <div className="relative w-32 h-32 mb-8">
        <div
          className="absolute inset-0 rounded-full border-2 border-gold/40 animate-spin"
          style={{ animationDuration: "3.5s" }}
        />
        <div
          className="absolute inset-3 rounded-full border border-gold/30 animate-spin"
          style={{ animationDuration: "5.5s", animationDirection: "reverse" }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">
          ⚔️
        </div>
      </div>

      <Skeleton className="h-3 w-32 mb-3" />
      <p className="display-serif text-sm tracking-[0.4em] text-gold/70 uppercase mb-6">
        編織帷幕
      </p>
      <div className="flex gap-2">
        <Skeleton className="w-16 h-20 rounded-lg" />
        <Skeleton className="w-16 h-20 rounded-lg" />
        <Skeleton className="w-16 h-20 rounded-lg" />
        <Skeleton className="w-16 h-20 rounded-lg" />
        <Skeleton className="w-16 h-20 rounded-lg" />
      </div>
    </div>
  );
}
