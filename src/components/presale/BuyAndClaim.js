import React from "react";
import { motion } from "framer-motion";
import { BN } from "@coral-xyz/anchor";

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
  icoData,
  userIcoData,
  actionLoading,
}) {
  if (!isConnected)
    return (
      <div className="block text-center rounded-full font-bold text-lg py-2 px-3 text-black bg-black/40 border border-black/40 mt-5 w-full">
        Connect Wallet to Buy 👆
      </div>
    );

  // Presale logic
  const now = Date.now();
  const start = icoData?.startTime ? new Date(new BN(icoData.startTime).toNumber()).getTime() : 0;
  const end = icoData?.endTime ? new Date(new BN(icoData.endTime).toNumber()).getTime() : 0;
  const hasClaimable = userIcoData && userIcoData.buyTokenAmount > 0;

  // Not started
  if (start && now < start) {
    return <div className="w-full text-center font-bold text-yellow-600 mt-6">Starting soon...</div>;
  }
  // Ended
  if (end && now >= end) {
    return hasClaimable ? (
      <motion.button
        disabled={actionLoading}
        onClick={claimToken}
        className="outline-2 outline-black mt-2 mb-2 p-0.5 rounded-full w-full relative"
        animate={claimControls}
        onMouseEnter={handleClaimHover}
        onMouseLeave={handleClaimLeave}>
        <div className="block text-center rounded-full font-bold text-lg py-2 px-3 hover:text-yellow-500 hover:bg-black bg-transparent w-full cursor-pointer text-black">
          CLAIM
        </div>
      </motion.button>
    ) : (
      <motion.button
        className="outline-2 outline-black mt-2 mb-2 p-0.5 rounded-full w-full relative opacity-55"
        animate={claimControls}
        onMouseEnter={handleClaimHover}
        onMouseLeave={handleClaimLeave}>
        <div className="block text-center rounded-full font-bold text-lg py-2 px-3 hover:text-yellow-500 hover:bg-black bg-transparent w-full cursor-pointer text-black">
          NOTHING TO CLAIM
        </div>
      </motion.button>
    );
  }
  // Ongoing
  return (
    <motion.button
      disabled={actionLoading}
      onClick={buyToken}
      className="outline-2 outline-black mt-6 mb-2 p-0.5 rounded-full w-full relative"
      animate={buyControls}
      onMouseEnter={handleBuyHover}
      onMouseLeave={handleBuyLeave}>
      <div className="block text-center rounded-full font-bold text-lg py-2 px-3 text-yellow-500 bg-black hover:bg-transparent w-full cursor-pointer hover:text-black">
        BUY
      </div>
    </motion.button>
  );
}
