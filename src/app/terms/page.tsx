import Link from "next/link";

export const metadata = {
  title: "服務條款 · 謊言編年者",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 font-[family-name:var(--font-noto-serif)] text-parchment/80 leading-relaxed">
      <Link
        href="/"
        className="inline-block text-parchment/50 hover:text-parchment text-sm mb-6"
      >
        ← 回首頁
      </Link>
      <h1 className="display-serif text-4xl text-sacred mb-3">服務條款</h1>
      <p className="text-xs text-parchment/40 tracking-widest mb-10">
        最後更新:{new Date().getFullYear()} / {String(new Date().getMonth() + 1).padStart(2, "0")}
      </p>

      <Section title="1. 關於本服務">
        <p>
          《謊言編年者》(以下簡稱「本遊戲」)是一款卡牌對戰 RPG 網頁遊戲。您使用本服務即表示您已閱讀並同意本條款。
        </p>
      </Section>

      <Section title="2. 帳號與安全">
        <ul className="list-disc ml-5 space-y-1.5">
          <li>您需提供有效的 Email 與密碼建立帳號。</li>
          <li>訪客帳號進度綁定於您的裝置,清除本機資料或更換裝置將導致無法繼續遊戲進度。</li>
          <li>您應自行妥善保管密碼;因密碼外洩造成的損失由使用者自負。</li>
          <li>禁止以任何手段修改、破解、自動化腳本或其他不正當方式影響遊戲運行。</li>
        </ul>
      </Section>

      <Section title="3. 內容與智慧財產">
        <p>
          本遊戲所有文字、美術、卡面、音訊與程式碼,其智慧財產權歸開發團隊所有。使用者不得擅自複製、散布或用於商業用途。
        </p>
      </Section>

      <Section title="4. 虛擬貨幣與道具">
        <ul className="list-disc ml-5 space-y-1.5">
          <li>遊戲內貨幣(水晶、信念幣)與卡牌僅為遊戲內使用,不具現金價值、不可兌換、不可轉讓。</li>
          <li>若未來開通儲值功能,詳細條款將於該功能上線時另行公告。</li>
          <li>開發團隊保留在合理範圍內調整機率、活動或道具屬性的權利。</li>
        </ul>
      </Section>

      <Section title="5. 服務可用性">
        <p>
          本遊戲為 beta 階段提供。開發團隊會盡力維持服務穩定,但可能因維護、更新或不可抗力因素暫時中斷。
        </p>
      </Section>

      <Section title="6. 終止與處分">
        <p>
          若使用者違反本條款(含但不限於作弊、辱罵、違法內容),開發團隊得暫停或終止該帳號,且無須事先通知。
        </p>
      </Section>

      <Section title="7. 免責聲明">
        <p>
          本服務以「現狀」提供。開發團隊不保證服務永遠無錯誤、無中斷,亦不對因使用本服務造成的任何間接損失負責。
        </p>
      </Section>

      <Section title="8. 條款變更">
        <p>
          開發團隊得隨時修改本條款。重大變更將於登入首頁或遊戲公告揭示,繼續使用即視為同意變更後條款。
        </p>
      </Section>

      <Section title="9. 聯絡">
        <p>
          如對本條款有疑問,請透過遊戲內設定或官方管道與我們聯繫。
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
