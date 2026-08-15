import { type NavItemProps } from "./types/configDataTypes";

export const navItems = [
  { label: "Trang Chủ", href: "/" },
  { label: "🚨 Cảnh Báo Scam", href: "/blog/?category=scam" },
  { label: "📊 Phân Tích Coin", href: "/blog/?category=analysis" },
  { label: "🛡️ Bảo Mật Ví", href: "/blog/?category=security" },
  { label: "⚡ Tin On-Chain", href: "/blog/?category=news" },
] as const satisfies readonly NavItemProps[];
