import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/config";
import { IntroProvider } from "@/components/intro/IntroProvider";
import IntroLoader from "@/components/intro/IntroLoader";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SavedToast } from "@/components/SavedToast";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: true,
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  openGraph: {
    siteName: siteConfig.name,
    description: siteConfig.description,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={displayFont.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var params = new URLSearchParams(window.location.search);
                var force = params.has('intro') || params.has('replay');
                if (sessionStorage.getItem('lita-intro-seen') === '1' && !force) {
                  document.documentElement.classList.add('intro-done');
                }
              } catch(e) {}
            `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html.intro-done #intro-overlay {
                display: none !important;
              }
              html.intro-done #nav-logo {
                visibility: visible !important;
              }
              html:not(.intro-done) body {
                overflow: hidden !important;
              }
            `,
          }}
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <IntroProvider>
          <IntroLoader />
          <SavedToast />
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </IntroProvider>
      </body>
    </html>
  );
}

