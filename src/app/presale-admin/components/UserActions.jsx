import React from "react";

export default function UserActions({ amount, setAmount, loading, buyTokens, claimTokens, icoData, userIcoData }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Buy Tokens</h3>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount to buy"
        className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-blue-800 focus:border-blue-800 mb-4"
      />
      <button
        onClick={buyTokens}
        disabled={loading || !icoData}
        className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors mb-2">
        {loading ? "Processing..." : "Buy with USDC"}
      </button>
      {icoData && userIcoData && userIcoData.buyTokenAmount > 0 && (
        <button
          onClick={claimTokens}
          disabled={loading}
          className="w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors">
          {loading ? "Claiming..." : "Claim Tokens"}
        </button>
      )}
      {loading && <div className="text-center animate-pulse text-gray-600 mt-4">Processing transaction...</div>}
    </div>
  );
}
