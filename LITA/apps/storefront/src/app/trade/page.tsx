import type { Metadata } from "next";
import { TradePageContent } from "@/components/TradePageContent";

export const metadata: Metadata = {
  title: "Trade Program | Livinin The Art",
  description:
    "Artwork for your entire project, all in one place. Members of the trade have a dedicated art advisor to provide artwork options, coordinate custom pieces, and place orders with exclusive trade pricing.",
  openGraph: {
    title: "Trade Program | Livinin The Art",
    description:
      "Artwork for your entire project, all in one place. Dedicated art advisors, custom curations, and exclusive trade pricing for interior designers, architects, and developers.",
    type: "website",
  },
};

export default function TradePage() {
  return <TradePageContent />;
}
