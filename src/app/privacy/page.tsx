import Link from "next/link";

export const metadata = {
  title: "隱私政策 · 謊言編年者",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 font-[family-name:var(--font-noto-serif)] text-parchment/80 leading-relaxed">
      <Link
        href="/"
        className="inline-block text-parchment/50 hover:text-parchment text-sm mb-6"
      >
        ← 回首頁
      </Link>
      <h1 className="display-serif text-4xl text-sacred mb-3">隱私政策</h1>
      <p className="text-xs text-parchment/40 tracking-widest mb-10">
        最後更新:{new Date().getFullYear()} / {String(new Date().getMonth() + 1).padStart(2, "0")}
      </p>

      <Section title="1. 我們蒐集什麼">
        <ul className="list-disc ml-5 space-y-1.5">
          <li>
            <strong className="text-parchment">帳號資料</strong>:註冊時提供的使用者名稱、Email、密碼(以 bcrypt 單向雜湊儲存)。
          </li>
          <li>
            <strong className="text-parchment">遊戲資料</strong>:戰鬥紀錄、擁有卡牌、貨幣與時代進度、抽卡計數等。
          </li>
          <li>
            <strong className="text-parchment">裝置識別</strong>:僅於訪客模式時產生一組本機 UUID,儲存在您瀏覽器的 localStorage。
          </li>
          <li>
            <strong className="text-parchment">技術日誌</strong>:伺服器為除錯與防作弊會記錄 IP、User-Agent、請求時間。此類日誌保留 90 天。
          </li>
        </ul>
      </Section>

      <Section title="2. 我們不蒐集什麼">
        <ul className="list-disc ml-5 space-y-1.5">
          <li>我們不追蹤您於其他網站的瀏覽行為,不使用第三方行銷 cookie。</li>
          <li>我們不接觸您的位置、聯絡人、相機、麥克風。</li>
        </ul>
      </Section>

      <Section title="3. 資料如何使用">
        <ul className="list-disc ml-5 space-y-1.5">
          <li>維持遊戲帳號與進度同步。</li>
          <li>防止作弊(HMAC 簽章、速率限制、戰鬥資料 sanity 檢查)。</li>
          <li>回應技術問題或異常行為審查。</li>
        </ul>
      </Section>

      <Section title="4. 資料如何儲存">
        <ul className="list-disc ml-5 space-y-1.5">
          <li>資料存於 Railway 託管的 PostgreSQL 資料庫(位於歐洲 EU-West 區域)。</li>
          <li>密碼以 bcrypt(cost 10)雜湊,我們無法讀取原始密碼。</li>
          <li>伺服器以 HTTPS 傳輸,不會透過明文通道傳送密碼或 session。</li>
        </ul>
      </Section>

      <Section title="5. 第三方服務">
        <ul className="list-disc ml-5 space-y-1.5">
          <li>卡牌美術由 Cloudflare Workers AI 與 Pollinations 生成,不會向其傳送您的個人資料。</li>
          <li>部署平台 Railway 可能基於營運必要取得日誌資料。</li>
          <li>若未來引入金流或廣告服務,將於該功能上線前更新本政策。</li>
        </ul>
      </Section>

      <Section title="6. 您的權利">
        <ul className="list-disc ml-5 space-y-1.5">
          <li>您可隨時在設定頁清除本機資料,此操作不會刪除伺服器端帳號。</li>
          <li>如需刪除帳號與全部遊戲資料,請透過遊戲內回報管道提出。</li>
          <li>GDPR / 個資法適用下的查詢、更正、刪除、可攜權,我們將於合理時間內配合。</li>
        </ul>
      </Section>

      <Section title="7. Cookie 與 localStorage">
        <ul className="list-disc ml-5 space-y-1.5">
          <li>登入 session 以 httpOnly cookie 儲存(由 NextAuth 管理)。</li>
          <li>localStorage 僅存:音量、BGM 開關、訪客裝置 ID、圖鑑已看過的卡列表。</li>
          <li>清除瀏覽器資料會導致這些本機設定重置。</li>
        </ul>
      </Section>

      <Section title="8. 兒童隱私">
        <p>
          本服務不針對 13 歲以下兒童設計。若發現有未成年使用者透露個資,我們將在確認後刪除該帳號。
        </p>
      </Section>

      <Section title="9. 政策變更">
        <p>
          重大變更將於登入首頁或遊戲公告揭示,繼續使用即視為同意變更後政策。
        </p>
      </Section>

      <p className="text-xs text-parchment/40 mt-12 tracking-widest text-center">
        這是 beta 階段的占位文件 — 上架前將由法務顧問最終審閱。
      </p>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="display-serif text-xl text-parchment mb-3">{title}</h2>
      <div className="text-sm text-parchment/75 space-y-2">{children}</div>
    </section>
  );
}
