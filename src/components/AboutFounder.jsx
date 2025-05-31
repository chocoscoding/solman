"use client";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { fadeInUpSpring, tiltHoverRightSpringButton, tiltHoverSpringButton } from "@/utils/animations";

const bgUrl = "/solman3.jpg"; // Place your background image in /public

const AboutFounder = () => {
  return (
    <section
      className="relative w-full py-16 md:py-40 overflow-hidden font-sans"
      style={{
        backgroundImage: `url(solman_supercharge_sol.jpg)`,
        backgroundSize: "cover",
        backgroundPosition: "bottom",
        backgroundAttachment: "fixed",
      }}>
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-cyan-950/98 pointer-events-none z-0" />
      <motion.div
        className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-10 px-6"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1, type: "spring", bounce: 0.2 }}>
        {/* Founder Image */}
        <div className="w-full md:w-1/3 flex justify-center">
          <div className="rounded-2xl overflow-hidden shadow-lg border-4 border-white/20 bg-white/10 backdrop-blur">
            <Image
              src="/solman3.jpg" // Place your founder image in /public
              alt="Founder"
              width={320}
              height={320}
              className="object-cover w-60 h-full md:w-80 max-h-[410px] object-top"
              priority
            />
          </div>
        </div>
        {/* Founder Text */}
        <div className="w-full md:w-2/3 text-white">
          <motion.h2
            className="text-3xl md:text-5xl font-extrabold mb-4 font-gorditas"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 1 }}>
            About the Founder
          </motion.h2>
          <motion.p
            className="text-lg md:text-xl mb-6 leading-relaxed"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.7 }}
            transition={{ duration: 0.8, delay: 0.1 }}>
            Meet <span className="font-bold text-yellow-300 font-gorditas">SolMan</span>,<br /> the visionary behind the meme coin
            revolution. <br />
            With a passion for blockchain, transparency, and community, SolMan is on a mission to restore trust and fun to the Solana
            ecosystem. <br /> His journey is fueled by creativity, relentless optimism, and a love for memes that unite people worldwide.
          </motion.p>
          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.7 }}
            transition={{ duration: 0.7, delay: 0.15 }}>
            <motion.button
              {...fadeInUpSpring}
              {...tiltHoverSpringButton}
              className="inline-block bg-yellow-400/90 text-black font-bold px-5 py-3 rounded boxShadow cursor-pointer"
              onClick={() => {
                const link = document.createElement("a");
                link.href = "/SolMan_Token_Whitepaper.pdf";
                link.download = "SolMan_Token_Whitepaper.pdf";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>
              Download whitepaper
            </motion.button>
            <motion.button
              {...fadeInUpSpring}
              {...tiltHoverRightSpringButton}
              className="inline-block bg-white/80 text-black font-bold px-5 py-3 rounded boxShadow cursor-pointer">
              Meme Pioneer
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
      {/* Mobile fallback for parallax */}
      <style jsx>{`
        @media (max-width: 768px) {
          section[style] {
            background-attachment: scroll !important;
          }
        }
      `}</style>
    </section>
  );
};

export default AboutFounder;
