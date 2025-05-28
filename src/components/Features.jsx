"use client";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const features = [
  {
    title: "Locked Liquidity",
    image: "/p2e.jpg",
    description:
      "Core liquidity will be locked using decentralized solutions for a predefined period, ensuring funds are safe and inaccessible to bad actors.",
  },
  {
    title: "Multi-Signature Treasury Wallets",
    image: "/m2e.jpg",
    description: "Major transactions require consensus from a multi-signature team, preventing unilateral actions and increasing security.",
  },
  {
    title: "No Hidden Dev Wallets",
    image: "/solman3.jpg",
    description:
      "All token allocations are public and trackable. There are no secret developer wallets—every movement is visible on-chain.",
  },
  {
    title: "Transparent Code",
    image: "/votiing.jpg",
    description:
      "All contracts will be open-sourced and audited when applicable. We commit to full transparency and invite the community to verify all smart contract activity on-chain.",
  },
];

const Features = () => {
  return (
    <section
      className="w-full relative"
      style={{
        backgroundImage: `url(maincover.jpg)`,
        backgroundSize: "cover",
        backgroundPosition: "bottom",
        backgroundAttachment: "fixed",
      }}>
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-yellow-700/20 pointer-events-none z-0" />
      <main className="mx-auto max-w-7xl px-4 py-12 lg:py-30 text-slate-100">
        <div className="flex w-full justify-center mb-12 px-2">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 1 }}
            className="z-10 max-w-2xl text-5xl text-center text-wrap font-gorditas font-bold md:text-6xl uppercase">
            SAY NO TO RUG PULL
          </motion.h2>
        </div>
        <div className="grid grid-cols-12 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: i * 0.12 }}
              className={
                (i === 0
                  ? "col-span-12 md:col-span-5"
                  : i === 1
                  ? "col-span-12 md:col-span-7"
                  : i === 2
                  ? "col-span-12 md:col-span-8"
                  : "col-span-12 md:col-span-4") +
                " boxShadow2 group relative min-h-[300px] cursor-pointer overflow-hidden rounded-2xl bg-black/20 p-6 backdrop-blur-md shadow-lg border border-white/30 md:h-[350px]"
              }>
              <h3 className="mx-auto text-center text-3xl font-semibold font-mono">{feature.title}</h3>
              <p>{feature.description}</p>
              <div className="h-[300px] right-4 top-24 translate-y-8 rounded-t-2xl overflow-hidden p-4 transition-transform duration-[250ms] group-hover:translate-y-4 group-hover:rotate-[2deg] flex items-center justify-center">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover w-full h-auto object-top md:object-center rounded-t-2xl"
                  style={{ position: "absolute" }}
                />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex w-full justify-center mt-10 px-2">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 1, delay: 0.3 }}
            className="max-w-2xl text-lg md:text-xl text-center font-mono">
            We commit to full transparency and invite the community to verify all smart contract activity on-chain.
          </motion.p>
        </div>
      </main>
    </section>
  );
};

export default Features;
