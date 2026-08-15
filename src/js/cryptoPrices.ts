export interface CryptoTicker {
  symbol: string;
  name: string;
  price: number;
  priceFormatted: string;
  change24h: number;
  changeFormatted: string;
  isPositive: boolean;
}

const DEFAULT_TICKERS: Record<string, { price: number; change24h: number }> = {
  BTCUSDT: { price: 96420, change24h: 2.4 },
  ETHUSDT: { price: 2740, change24h: -0.8 },
  SOLUSDT: { price: 188.5, change24h: 5.1 },
};

export function formatCryptoPrice(price: number): string {
  if (price >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(price);
}

export function formatChangePercent(percent: number): { formatted: string; isPositive: boolean } {
  const isPositive = percent >= 0;
  const formatted = `${isPositive ? "+" : ""}${percent.toFixed(2)}%`;
  return { formatted, isPositive };
}

/**
 * Fetch latest 24h ticker prices from Binance public REST API with timeout.
 * Returns default fallback values if the request fails or times out.
 */
export async function getBinancePrices(): Promise<CryptoTicker[]> {
  const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
  const symbolNames: Record<string, string> = {
    BTCUSDT: "BTC",
    ETHUSDT: "ETH",
    SOLUSDT: "SOL",
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(
      JSON.stringify(symbols),
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

    return symbols.map((sym) => {
      const item = data.find((d) => d.symbol === sym);
      const rawPrice = item ? parseFloat(item.lastPrice) : DEFAULT_TICKERS[sym].price;
      const rawChange = item ? parseFloat(item.priceChangePercent) : DEFAULT_TICKERS[sym].change24h;
      const { formatted: changeFormatted, isPositive } = formatChangePercent(rawChange);

      return {
        symbol: sym,
        name: symbolNames[sym] || sym,
        price: rawPrice,
        priceFormatted: formatCryptoPrice(rawPrice),
        change24h: rawChange,
        changeFormatted,
        isPositive,
      };
    });
  } catch {
    // Fallback if Binance is unreachable during SSR build
    return symbols.map((sym) => {
      const fallback = DEFAULT_TICKERS[sym];
      const { formatted: changeFormatted, isPositive } = formatChangePercent(fallback.change24h);
      return {
        symbol: sym,
        name: symbolNames[sym] || sym,
        price: fallback.price,
        priceFormatted: formatCryptoPrice(fallback.price),
        change24h: fallback.change24h,
        changeFormatted,
        isPositive,
      };
    });
  }
}
