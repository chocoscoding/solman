import { Geist, Geist_Mono, Sour_Gummy } from "next/font/google";
import "./globals.css";
import WalletWrapper from "@/components/WalletWrapper";
import { Toaster } from "@/components/ui/sonner";
import { HeroHeader } from "@/components/header";
import ReactLenis from "lenis/dist/lenis-react";
import Footer from "@/components/Footer";
import NextTopLoader from "nextjs-toploader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const gorditas = Sour_Gummy({
  variable: "--font-gorditas-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata = {
  title: "Sol man",
  description: "The Meme Warrior of Solana",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${gorditas.variable} ${geistMono.variable} antialiased`}>
        <NextTopLoader color="#000000" showSpinner={false} />
        <ReactLenis
          root
          options={{
            lerp: 0.05,
          }}>
          <WalletWrapper>
            <HeroHeader />
            {children}
            <Footer />
          </WalletWrapper>
          <Toaster richColors />
        </ReactLenis>
      </body>
    </html>
  );
}
