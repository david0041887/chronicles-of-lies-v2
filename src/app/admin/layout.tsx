import { BottomTabs } from "@/components/game/BottomTabs";
import { TopBar } from "@/components/game/TopBar";
import { requireAdmin } from "@/lib/auth-helpers";
import { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <>
      <TopBar />
      <div className="flex-1 pb-20">{children}</div>
      <BottomTabs />
    </>
  );
}
