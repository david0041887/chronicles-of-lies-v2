import { BgmPlayer } from "@/components/fx/BgmPlayer";
import { PageBackdrop } from "@/components/fx/PageBackdrop";
import { RouteTransition } from "@/components/fx/RouteTransition";
import { BottomTabs } from "@/components/game/BottomTabs";
import { TopBar } from "@/components/game/TopBar";
import { requireUser } from "@/lib/auth-helpers";
import { ReactNode } from "react";

export default async function GameLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return (
    <>
      <PageBackdrop />
      <TopBar />
      <div className="flex-1 pb-20 relative">
        <RouteTransition>{children}</RouteTransition>
      </div>
      <BottomTabs />
      <BgmPlayer />
    </>
  );
}
