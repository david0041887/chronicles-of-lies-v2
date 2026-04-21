import { Navbar } from "@/components/game/Navbar";
import { requireUser } from "@/lib/auth-helpers";
import { ReactNode } from "react";

export default async function GameLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Navbar isAdmin={user.role === "ADMIN"} />
      <div className="flex-1">{children}</div>
    </>
  );
}
