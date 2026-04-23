import { BgmPlayer } from "@/components/fx/BgmPlayer";
import { BottomTabs } from "@/components/game/BottomTabs";
import { TopBar } from "@/components/game/TopBar";
import { requireUser } from "@/lib/auth-helpers";
import { ReactNode } from "react";

export default async function GameLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return (
    <>
      <TopBar />
      <div className="flex-1 pb-20">{children}</div>
      <BottomTabs />
      <BgmPlayer />
    </>
  );
}
