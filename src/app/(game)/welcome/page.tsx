import { VeilBackdrop } from "@/components/fx/VeilBackdrop";
import { requireUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { WelcomeClient } from "./WelcomeClient";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await requireUser();
  if (user.tutorialDone) redirect("/home");

  return (
    <div className="relative min-h-[calc(100vh-3rem)]">
      <VeilBackdrop intensity="high" />
      <WelcomeClient username={user.username} />
    </div>
  );
}
