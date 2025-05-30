import React from "react";

export function InitializePresale({ icoData, loading, createPresale }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Initialize Presale</h3>
      {icoData ? (
        <div className="mt-4 text-center">
          <div className="text-green-700 text-lg font-semibold flex items-center justify-center gap-2">
            <span>✅</span>
            <span>Initialized successfully</span>
          </div>
          <div className="mt-2 text-gray-700">You are ready to go! Move to the other sections to continue.</div>
        </div>
      ) : (
        <button
          onClick={createPresale}
          disabled={loading}
          className="w-full p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors mb-1">
          {loading ? "Initializing..." : "Initialize Presale"}
        </button>
      )}
    </div>
  );
}

export function StartPresale({ icoData, loading, startPresale }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Start Presale</h3>
      {icoData?.isLive ? (
        <div className="flex flex-col items-center justify-center mt-4">
          <span className="text-2xl mb-2">✅</span>
          <div className="text-green-700 font-semibold text-lg">Presale is live and has started!</div>
          <div className="text-gray-700 mt-1 text-center">
            You can update presale data in the <span className="font-semibold">Update Presale</span> section.
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={startPresale}
            disabled={loading}
            className="w-full p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors mb-3">
            {loading ? "Starting..." : "Start Presale"}
          </button>
          <div className="text-gray-700 mt-2 text-center">
            Once you click <span className="font-semibold">Start Presale</span>, your project will go live and become buyable for users
            between <span className="font-mono">{new Date(Date.now()).toLocaleString()}</span> and{" "}
            <span className="font-mono">{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleString()}</span>.<br />
            You can change these dates later in the <span className="font-semibold">Update Presale</span> section.
          </div>
        </>
      )}
    </div>
  );
}

export function UpdatePresale({
  maxTokenAmountPerAddress,
  setMaxTokenAmountPerAddress,
  pricePerToken,
  setPricePerToken,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  loading,
  updatePresale,
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Update Presale Parameters</h3>
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="maxTokenAmountPerAddress">
        Max tokens per address
      </label>
      <input
        id="maxTokenAmountPerAddress"
        type="number"
        value={maxTokenAmountPerAddress}
        onChange={(e) => setMaxTokenAmountPerAddress(e.target.value)}
        placeholder="Max tokens per address"
        className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 mb-2"
      />
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="pricePerToken">
        Price per token (in USDC)
      </label>
      <input
        id="pricePerToken"
        type="number"
        value={pricePerToken}
        onChange={(e) => setPricePerToken(e.target.value)}
        placeholder="Price per token (in USDC)"
        className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 mb-2"
      />
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="startTime">
        Start time
      </label>
      <input
        id="startTime"
        type="datetime-local"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        placeholder="Start time"
        className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 mb-2"
      />
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="endTime">
        End time
      </label>
      <input
        id="endTime"
        type="datetime-local"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
        placeholder="End time"
        className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 mb-4"
      />
      <button
        onClick={updatePresale}
        disabled={loading}
        className="w-full p-2.5 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 disabled:bg-gray-400 transition-colors">
        {loading ? "Updating..." : "Update Presale"}
      </button>
    </div>
  );
}

export function DepositTokens({ amount, setAmount, loading, depositTokens }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Deposit Tokens</h3>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount to deposit"
        className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-indigo-800 focus:border-indigo-800 mb-4"
      />
      <button
        onClick={depositTokens}
        disabled={loading}
        className="w-full p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors">
        {loading ? "Depositing..." : "Deposit Tokens"}
      </button>
    </div>
  );
}

export function WithdrawSol({ amount, setAmount, loading, withdrawSol }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Withdraw SOL</h3>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount to withdraw (SOL)"
        className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-purple-800 focus:border-purple-800 mb-4"
      />
      <button
        onClick={withdrawSol}
        disabled={loading}
        className="w-full p-2.5 bg-gradient-to-r from-purple-500 to-green-400 text-white rounded-lg hover:from-purple-600 hover:to-green-500 disabled:bg-gray-400 transition-colors">
        {loading ? "Withdrawing..." : "Withdraw SOL"}
      </button>
    </div>
  );
}

export function WithdrawToken({ amount, setAmount, loading, withdrawToken }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Withdraw Tokens</h3>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount to withdraw (tokens)"
        className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-yellow-800 focus:border-yellow-800 mb-4"
      />
      <button
        onClick={withdrawToken}
        disabled={loading}
        className="w-full p-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors">
        {loading ? "Withdrawing..." : "Withdraw Tokens"}
      </button>
    </div>
  );
}

export function WithdrawUsdc({ amount, setAmount, loading, withdrawUsdc }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Withdraw USDC</h3>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount to withdraw (USDC)"
        className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-sky-800 focus:border-sky-800 mb-4"
      />
      <button
        onClick={withdrawUsdc}
        disabled={loading}
        className="w-full p-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:bg-gray-400 transition-colors">
        {loading ? "Withdrawing..." : "Withdraw USDC"}
      </button>
    </div>
  );
}
