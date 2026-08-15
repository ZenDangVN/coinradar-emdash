import { type SiteDataProps } from "./types/configDataTypes";

const siteData = {
  name: "CoinRadar",
  title: "CoinRadar — Cổng Thông Tin & Cảnh Báo Lừa Đảo Crypto",
  description:
    "Nền tảng truyền thông độc lập chuyên cảnh báo scam, phân tích dữ liệu On-Chain và nâng cao năng lực bảo mật tài sản số cho cộng đồng Web3.",

  author: {
    name: "CoinRadar Security Lab",
    email: "security@coinradar.vn",
    twitter: "coinradar_vn",
  },

  defaultImage: {
    src: "/og.jpg",
    alt: "CoinRadar - Cảnh Báo Crypto",
  },

  sameAs: ["https://t.me/coinradar_vn", "https://x.com/coinradar_vn"],
} satisfies SiteDataProps;

export default siteData;
