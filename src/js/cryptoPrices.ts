export interface CryptoTicker {
  symbol: string;
  name: string;
  price: number;
  priceFormatted: string;
  change24h: number;
  changeFormatted: string;
  isPositive: boolean;
}

export interface CoinConfig {
  symbol: string;
  name: string;
  fullName: string;
  pair: string;
  defaultPrice: number;
  defaultChange: number;
}

export const DEFAULT_COIN_SYMBOLS = ["BTC", "ETH", "XRP", "SOL", "NEAR"];

export const SUPPORTED_COINS: CoinConfig[] = [
  { symbol: "BTC", name: "BTC", fullName: "Bitcoin", pair: "BTCUSDT", defaultPrice: 85000, defaultChange: 2.4 },
  { symbol: "ETH", name: "ETH", fullName: "Ethereum", pair: "ETHUSDT", defaultPrice: 2700, defaultChange: -0.8 },
  { symbol: "XRP", name: "XRP", fullName: "Ripple", pair: "XRPUSDT", defaultPrice: 1.55, defaultChange: 3.2 },
  { symbol: "SOL", name: "SOL", fullName: "Solana", pair: "SOLUSDT", defaultPrice: 125, defaultChange: 4.8 },
  { symbol: "NEAR", name: "NEAR", fullName: "NEAR Protocol", pair: "NEARUSDT", defaultPrice: 5.2, defaultChange: 1.9 },
  { symbol: "BNB", name: "BNB", fullName: "Binance Coin", pair: "BNBUSDT", defaultPrice: 620, defaultChange: 1.1 },
  { symbol: "DOGE", name: "DOGE", fullName: "Dogecoin", pair: "DOGEUSDT", defaultPrice: 0.18, defaultChange: -1.5 },
  { symbol: "ADA", name: "ADA", fullName: "Cardano", pair: "ADAUSDT", defaultPrice: 0.72, defaultChange: 2.1 },
  { symbol: "AVAX", name: "AVAX", fullName: "Avalanche", pair: "AVAXUSDT", defaultPrice: 24.5, defaultChange: -0.6 },
  { symbol: "LINK", name: "LINK", fullName: "Chainlink", pair: "LINKUSDT", defaultPrice: 16.8, defaultChange: 3.4 },
  { symbol: "SUI", name: "SUI", fullName: "Sui Network", pair: "SUIUSDT", defaultPrice: 2.85, defaultChange: 6.2 },
  { symbol: "DOT", name: "DOT", fullName: "Polkadot", pair: "DOTUSDT", defaultPrice: 6.1, defaultChange: -1.2 },
  { symbol: "PEPE", name: "PEPE", fullName: "Pepe Coin", pair: "PEPEUSDT", defaultPrice: 0.0000085, defaultChange: 5.6 },
  { symbol: "SHIB", name: "SHIB", fullName: "Shiba Inu", pair: "SHIBUSDT", defaultPrice: 0.000014, defaultChange: 1.8 },
  { symbol: "TON", name: "TON", fullName: "Toncoin", pair: "TONUSDT", defaultPrice: 4.8, defaultChange: 0.5 },
  { symbol: "ARB", name: "ARB", fullName: "Arbitrum", pair: "ARBUSDT", defaultPrice: 0.65, defaultChange: -2.3 },
  { symbol: "OP", name: "OP", fullName: "Optimism", pair: "OPUSDT", defaultPrice: 1.45, defaultChange: 1.2 },
  { symbol: "APT", name: "APT", fullName: "Aptos", pair: "APTUSDT", defaultPrice: 8.9, defaultChange: 4.1 },
  { symbol: "TRX", name: "TRX", fullName: "TRON", pair: "TRXUSDT", defaultPrice: 0.23, defaultChange: 0.4 },
  { symbol: "LTC", name: "LTC", fullName: "Litecoin", pair: "LTCUSDT", defaultPrice: 105, defaultChange: 2.0 },
];

const COIN_MAP = new Map(SUPPORTED_COINS.map((c) => [c.symbol, c]));

export function formatCryptoPrice(price: number): string {
  if (price >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  }
  if (price >= 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    }).format(price);
  }
  if (price >= 0.01) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(price);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 8,
  }).format(price);
}

export function formatChangePercent(percent: number): { formatted: string; isPositive: boolean } {
  const isPositive = percent >= 0;
  const formatted = `${isPositive ? "+" : ""}${percent.toFixed(2)}%`;
  return { formatted, isPositive };
}

/**
 * Normalizes an array of coin symbols and ensures valid supported symbols.
 * Defaults to ["BTC", "ETH", "XRP", "SOL", "NEAR"] if empty or invalid.
 */
export function normalizeCoinSymbols(symbols?: string[]): string[] {
  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return [...DEFAULT_COIN_SYMBOLS];
  }
  const valid = symbols
    .map((s) => s.trim().toUpperCase())
    .filter((s) => COIN_MAP.has(s));

  return valid.length > 0 ? Array.from(new Set(valid)) : [...DEFAULT_COIN_SYMBOLS];
}

/**
 * Fetch latest 24h ticker prices from Binance public REST API with timeout.
 * Returns default fallback values if the request fails or times out.
 */
export async function getBinancePrices(coinSymbols?: string[]): Promise<CryptoTicker[]> {
  const activeSymbols = normalizeCoinSymbols(coinSymbols);
  const activeCoins = activeSymbols.map((sym) => COIN_MAP.get(sym)!);
  const pairs = activeCoins.map((c) => c.pair);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(
      JSON.stringify(pairs),
    )}`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "CoinRadar/1.0" },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = (await response.json()) as Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
    }>;

    return activeCoins.map((coin) => {
      const item = data.find((d) => d.symbol === coin.pair);
      const rawPrice = item ? parseFloat(item.lastPrice) : coin.defaultPrice;
      const rawChange = item ? parseFloat(item.priceChangePercent) : coin.defaultChange;
      const { formatted: changeFormatted, isPositive } = formatChangePercent(rawChange);

      return {
        symbol: coin.symbol,
        name: coin.name,
        price: rawPrice,
        priceFormatted: formatCryptoPrice(rawPrice),
        change24h: rawChange,
        changeFormatted,
        isPositive,
      };
    });
  } catch {
    // Fallback if Binance is unreachable during SSR or offline
    return activeCoins.map((coin) => {
      const { formatted: changeFormatted, isPositive } = formatChangePercent(coin.defaultChange);
      return {
        symbol: coin.symbol,
        name: coin.name,
        price: coin.defaultPrice,
        priceFormatted: formatCryptoPrice(coin.defaultPrice),
        change24h: coin.defaultChange,
        changeFormatted,
        isPositive,
      };
    });
  }
}
