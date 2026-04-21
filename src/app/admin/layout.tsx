import { Navbar } from "@/components/game/Navbar";
import { requireAdmin } from "@/lib/auth-helpers";
import { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <>
      <Navbar isAdmin />
      <div className="flex-1 pb-20">{children}</div>
    </>
  );
}
