"use client";
import Image from "next/image";
import { FaCopy } from "react-icons/fa";
import { motion } from "framer-motion";
import { Marquee } from "./magicui/marquee";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Link from "next/link";
import { tiltHoverRightSpringButton, tiltHoverSpringButton } from "@/utils/animations";

const Letter3DSwap = dynamic(() => import("@/fancy/components/text/letter-3d-swap"), { ssr: false });

export default function Hero() {
  const contractAddress = "0xE1ABD004...01D094FAA180";

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    alert("Contract address copied!");
  };

  // Animation variants
  const fadeUp = {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.3, duration: 1.2 } },
  };

  return (
    <div className="min-h-screen bg-yellow-400 flex flex-col justify-between font-sans pt-10 overflow-hidden mt-[5rem] relative">
      <div className="flex flex-col md:flex-row items-center justify-between max-w-[1200px] mx-auto px-4 py-12 mt-[4rem] w-full z-10">
        <motion.div className="text-black max-w-2xl space-y-8" initial="hidden" animate="visible" variants={fadeUp}>
          <h1
            className="text-5xl md:text-8xl font-bold drop-shadow-lg font-gorditas text-shadow-white"
            style={{ textShadow: "2px 3px 2px #ffffffa8" }}>
            <Suspense fallback={<span>$SOLMAN</span>}>
              <Letter3DSwap rotateDirection="top" staggerFrom="center" suppressHydrationWarning>
                $SOLMAN
              </Letter3DSwap>
            </Suspense>
          </h1>
          <p className="text-base sm:text-lg md:text-xl font-mono">
            SolMan: The Meme Warrior of Solana. <br /> More than a meme — a mission to restore trust, culture, and transparency on the
            blockchain.
          </p>
          <div>
            <h2 className="font-bold text-lg md:text-2xl uppercase font-gorditas">Contract Address</h2>
            <div
              className="flex items-center mt-2 bg-white rounded-md shadow-lg overflow-hidden max-w-md"
              style={{ boxShadow: "2px 4px 0 0 #000, 0 0 1px 0 #000" }}>
              <div className="flex-1 px-4 py-2 truncate font-gorditas text-lg md:text-xl">{contractAddress}</div>
              <button
                onClick={handleCopy}
                className="bg-red-500 text-white px-4 py-2 hover:bg-red-600 shadow-black mr-2 my-1 rounded-md cursor-pointer"
                style={{ boxShadow: "0.25px 1px 0 0 #000, 0 0 1px 0 #000" }}>
                Copy
              </button>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <Link href="#">
              <motion.button
                {...tiltHoverSpringButton}
                className="bg-red-500 text-white px-2 sm:px-8 py-3 text-xl font-bold rounded-md shadow-black hover:bg-red-600 font-gorditas cursor-pointer"
                style={{ boxShadow: "2px 4px 0 0 #000, 0 0 1px 0 #000" }}>
                BUY $SOLMAN
              </motion.button>
            </Link>
            <Link href="#">
              <motion.button
                {...tiltHoverRightSpringButton}
                className="bg-white text-black px-2 sm:px-8 py-3 text-xl font-bold rounded-md shadow-black hover:bg-gray-100 font-gorditas cursor-pointer"
                style={{ boxShadow: "2px 4px 0 0 #000, 0 0 1px 0 #000" }}>
                RAYDIUM
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Right */}
        {/* <div className="border border-red-500">
          <img src="/solman1.png" alt="SOLMAN character" className="w-80 md:w-[1000px]" />
        </div> */}
      </div>

      {/* Top left faded image */}
      <motion.div
        className="absolute top-0 left-0 z-0 opacity-10 pointer-events-none"
        initial={{ opacity: 0, y: -32 }}
        animate={{ opacity: 0.1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.2 }}>
        <Image src="/solman1.png" alt="Ponke faded top left" width={180} height={180} className="w-32 md:w-44 lg:w-52 h-auto" priority />
      </motion.div>
      {/* Center right faded image */}
      <motion.div
        className="absolute top-9/12 left-4/12 z-0 opacity-10 -translate-y-1/2 pointer-events-none z-0"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 0.1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.4 }}>
        <Image src="/solman1.png" alt="Ponke faded center right" width={120} height={120} className="w-40 h-auto" priority />
      </motion.div>
      {/* Main hero image, absolute and behind content, only on md+ */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center z-0 w-full md:w-3/5 justify-end hidden md:block overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, x: 64 },
          visible: { opacity: 1, x: 0, transition: { type: "spring", bounce: 0.2, duration: 0.7, delay: 0.3 } },
        }}>
        <Image src="/solman2.png" alt="Ponke Hero" fill style={{ objectFit: "contain" }} className="opacity-100" priority />
      </motion.div>
      {/* Show hero image below text on small screens */}
      <motion.div
        className="block md:hidden mt-8 w-full flex justify-center"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.5 }}>
        <Image src="/solman1.png" alt="Ponke Hero" width={280} height={280} className="w-56 h-auto" priority />
      </motion.div>

      {/* Marquee */}
      <div className="bg-yellow-500 py-3 overflow-hidden z-30 w-full">
        <Marquee className="w-full">
          {Array(20)
            .fill("$SOLMAN")
            .map((text, i) => (
              <span key={i} className="mx-4 font-gorditas font-bold text-xl text-white">
                {text}
              </span>
            ))}
        </Marquee>
      </div>
    </div>
  );
}
