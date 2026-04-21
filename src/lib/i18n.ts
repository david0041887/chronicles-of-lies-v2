/**
 * Minimal i18n scaffold — currently covers Settings + a few nav strings.
 * Expand the dictionary as pages need translation.
 */
export type Locale = "zh" | "en";

export const LOCALE_KEY = "chronicles.locale";

const dict = {
  zh: {
    "settings.title": "設定",
    "settings.volume": "音量",
    "settings.language": "語言",
    "settings.clearLocal": "清除本機資料",
    "settings.logout": "登出",
    "settings.account": "帳號",
    "settings.bindAccount": "綁定正式帳號",
    "settings.guest": "訪客",
    "settings.bindHint": "您目前是訪客,進度僅存於此裝置。綁定後可跨裝置登入。",
    "settings.clearConfirm": "確定要清除本機資料?遊戲設定與訪客裝置 ID 都會消失(雲端資料不受影響)。",
    "common.save": "儲存",
    "common.cancel": "取消",
  },
  en: {
    "settings.title": "Settings",
    "settings.volume": "Volume",
    "settings.language": "Language",
    "settings.clearLocal": "Clear Local Data",
    "settings.logout": "Sign Out",
    "settings.account": "Account",
    "settings.bindAccount": "Bind a Real Account",
    "settings.guest": "Guest",
    "settings.bindHint":
      "You are currently a guest — progress is bound to this device. Bind an account to sync.",
    "settings.clearConfirm":
      "Clear all local data? Game settings and guest device ID will be erased (cloud data is safe).",
    "common.save": "Save",
    "common.cancel": "Cancel",
  },
} as const;

type Key = keyof (typeof dict)["zh"];

export function t(key: Key, locale: Locale = "zh"): string {
  return dict[locale]?.[key] ?? dict.zh[key] ?? key;
}

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
  return stored === "en" || stored === "zh" ? stored : "zh";
}

export function setStoredLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_KEY, locale);
}
