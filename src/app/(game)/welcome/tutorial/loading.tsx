import { Skeleton } from "@/components/ui/Skeleton";

export default function TutorialLoading() {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6 bg-gradient-to-b from-[#0A0612] via-[#180826] to-[#030107]">
      <div
        className="relative w-24 h-24 mb-6 rounded-full border-2 border-gold/50 animate-spin"
        style={{ animationDuration: "4s" }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-2xl">
          🎓
        </div>
      </div>
      <p className="display-serif text-sm tracking-[0.4em] text-gold/70 uppercase mb-2">
        準備教學戰
      </p>
      <Skeleton className="h-3 w-40" />
    </div>
  );
}
