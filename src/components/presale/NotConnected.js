import React from "react";

export default function WalletNotConnectedBlurred() {
  return (
    <div className="relative mx-4">
      {/* Blurred UI Overlay */}
      <div className="pointer-events-none filter blur-sm opacity-70">
        {/* Dummy UI for user */}
        <div className="py-8">
          <div className="mb-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-3">Allocation Status</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Supply</p>
                <p className="font-medium">1,000,000 tokens</p>
              </div>
              <div>
                <p className="text-gray-600">Tokens Sold</p>
                <p className="font-medium">250,000 tokens</p>
              </div>
              <div>
                <p className="text-gray-600">Token Price</p>
                <p className="font-medium">0.001 SOL</p>
              </div>
              <div>
                <p className="text-gray-600">Available</p>
                <p className="font-medium">750,000 tokens</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <input
              type="number"
              value="100"
              disabled
              placeholder="Amount of tokens to buy"
              className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 bg-gray-100"
              min="1"
              step="1"
            />
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
              <div className="flex justify-between">
                <span>Token Amount:</span>
                <span className="font-medium">100 tokens</span>
              </div>
              <div className="flex justify-between">
                <span>Cost:</span>
                <span className="font-medium">0.100 SOL</span>
              </div>
              <div className="flex justify-between">
                <span>Network Fee:</span>
                <span className="font-medium">~0.000005 SOL</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total:</span>
                <span>0.100005 SOL</span>
              </div>
            </div>
            <button disabled className="w-full p-3 bg-yellow-600 text-white rounded-lg opacity-70 cursor-not-allowed">
              Buy Tokens
            </button>
          </div>
        </div>
      </div>
      {/* Overlay message */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4">
        <div className="bg-white bg-opacity-80 rounded-xl px-6 py-8 shadow-lg flex flex-col items-center">
          <svg className="w-12 h-12 text-yellow-500 mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <p className="text-gray-600 text-center">Connect your Solana wallet to view your balance and buy tokens.</p>
        </div>
      </div>
    </div>
  );
}
