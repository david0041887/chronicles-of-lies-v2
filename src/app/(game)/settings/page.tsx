import { requireUser } from "@/lib/auth-helpers";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="display-serif text-3xl text-sacred mb-6">設定</h1>
      <SettingsClient
        user={{
          id: user.id,
          username: user.username,
          email: user.email,
          isGuest: user.isGuest,
          createdAt: user.createdAt.toISOString(),
        }}
      />
    </main>
  );
}
