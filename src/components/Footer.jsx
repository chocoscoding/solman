import Link from "next/link";
import React from "react";
import { FaTelegram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const Footer = () => {
  return (
    <footer className="bg-[#fdc700] pt-12 pb-0">
      <div className="max-w-3xl mx-auto px04 md:px-8 py-4 flex flex-col items-center rounded-3xl border-3 border-white/70 bg-[#ffd333] shadow-lg relative z-10 boxShadow2">
        <h3
          className="text-4xl md:text-5xl font-extrabold text-black drop-shadow mb-2 font-gorditas text-center tracking-wide mt-8"
          style={{ letterSpacing: 1 }}>
          JOIN OUR COMMUNITY
        </h3>
        <p className="text-xs md:text-sm text-black/80 mb-6 text-center font-semibold">
          Presale Buyers Of Blepe Will Be Able To Stake Their Tokens Into The Smart Contract Before Listing Day To Benefit From The High
          Early Rewards Opportunity.
        </p>
        <div className="flex gap-4 mb-8">
          <Link
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-7 py-2 rounded-lg shadow-md text-lg transition-colors boxShadow"
            style={{ border: "2px solid #222" }}>
            BUY $PONKE
          </Link>
          <Link
            href="https://t.me/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
            className="bg-white hover:bg-[#FFD43B] border-2 border-black rounded-lg w-12 h-12 flex items-center justify-center transition-colors boxShadow">
            <FaTelegram className="text-black text-2xl" />
          </Link>
          <Link
            href="https://x.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            className="bg-white hover:bg-[#FFD43B] border-2 border-black rounded-lg w-12 h-12 flex items-center justify-center transition-colors boxShadow">
            <FaXTwitter className="text-black text-2xl" />
          </Link>
        </div>
      </div>
      <div className="text-center py-4 mt-8">
        <span className="text-black font-bold text-base">Copyright © 2025 solmantoken | All Right Reserved</span>
      </div>
    </footer>
  );
};

export default Footer;
