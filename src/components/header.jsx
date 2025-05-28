"use client";
import Link from "next/link";
import React from "react";
import { FaTelegram, FaXTwitter } from "react-icons/fa6";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScroll } from "motion/react";

const navLinks = [
  { name: "HOME", href: "#" },
  { name: "ABOUT", href: "#" },
  { name: "HOW TO BUY", href: "#" },
  { name: "ROADMAP", href: "#" },
  { name: "PRESALE", href: "/presale" },
];

export const HeroHeader = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  const { scrollYProgress } = useScroll();

  React.useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      setScrolled(latest > 0.05);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  return (
    <header>
      <nav
        className={cn(
          "fixed z-20 w-full transition-colors duration-150 bg-[#fdc700] border-b border-black/10",
          scrolled && "bg-[#FFD43B]/90 backdrop-blur-2xl"
        )}>
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-3xl font-extrabold font-gorditas text-black tracking-tight select-none">Solman</span>
          </div>
          {/* Desktop Nav */}
          <ul className="hidden md:flex gap-8 items-center">
            {navLinks.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className="text-black font-extrabold text-base font-gorditas hover:underline underline-offset-4 transition-all">
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
          {/* Socials */}
          <div className="hidden md:flex gap-2 items-center">
            <Link
              href="https://t.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border-2 border-black rounded-lg w-10 h-10 flex items-center justify-center hover:bg-[#FFD43B] transition-colors"
              aria-label="Telegram">
              <FaTelegram className="text-black text-xl" />
            </Link>
            <Link
              href="https://x.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border-2 border-black rounded-lg w-10 h-10 flex items-center justify-center hover:bg-[#FFD43B] transition-colors"
              aria-label="X">
              <FaXTwitter className="text-black text-xl" />
            </Link>
          </div>
          {/* Hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}>
            {menuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-[#FFD43B] border-t border-black/10 shadow-lg z-40 animate-fade-in">
            <ul className="flex flex-col items-center gap-6 py-6">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-black font-extrabold text-lg font-gorditas hover:underline underline-offset-4 transition-all"
                    onClick={() => setMenuOpen(false)}>
                    {link.name}
                  </Link>
                </li>
              ))}
              <div className="flex gap-3 mt-4">
                <Link
                  href="https://t.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border-2 border-black rounded-lg w-10 h-10 flex items-center justify-center hover:bg-[#FFD43B] transition-colors"
                  aria-label="Telegram">
                  <FaTelegram className="text-black text-xl" />
                </Link>
                <Link
                  href="https://x.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border-2 border-black rounded-lg w-10 h-10 flex items-center justify-center hover:bg-[#FFD43B] transition-colors"
                  aria-label="X">
                  <FaXTwitter className="text-black text-xl" />
                </Link>
              </div>
            </ul>
          </div>
        )}
      </nav>
      {/* Spacer for fixed header */}
      <div className="h-16" />
    </header>
  );
};
