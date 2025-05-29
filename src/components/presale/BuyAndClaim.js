import React from "react";
import { motion } from "framer-motion";

export default function BuyAndClaim({
  buyControls,
  claimControls,
  handleBuyHover,
  handleBuyLeave,
  handleClaimHover,
  handleClaimLeave,
  isConnected,
  buyToken,
  claimToken,
}) {
  if (!isConnected) return <p className="mt-4 w-full text-center font-bold text-black">Connect Wallet to Buy</p>;
  return (
    <>
      <motion.button
        onClick={buyToken}
        className="outline-2 outline-black mt-6 mb-2 p-0.5 rounded-full w-full relative"
        animate={buyControls}
        onMouseEnter={handleBuyHover}
        onMouseLeave={handleBuyLeave}>
        <div className="block text-center rounded-full font-bold text-lg py-2 px-3 text-yellow-500 bg-black hover:bg-transparent w-full cursor-pointer hover:text-black">
          BUY
        </div>
      </motion.button>
      <motion.button
        onClick={claimToken}
        className="outline-2 outline-black mt-2 mb-2 p-0.5 rounded-full w-full relative"
        animate={claimControls}
        onMouseEnter={handleClaimHover}
        onMouseLeave={handleClaimLeave}>
        <div className="block text-center rounded-full font-bold text-lg py-2 px-3 hover:text-yellow-500 hover:bg-black bg-transparent w-full cursor-pointer text-black">
          CLAIM
        </div>
      </motion.button>
    </>
  );
}
