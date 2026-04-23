import { PageHeader } from "@/components/ui/PageHeader";
import { requireUser } from "@/lib/auth-helpers";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        eyebrow="Weaver Settings"
        title="設定"
        subtitle="音訊 / 語言 / 帳號 / 本機資料"
      />
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
