"use client";
import React, { useState } from "react";

export default function TwoWayBindingInput({ userUsdcBalance, pricePerToken, onChange }) {
  const [usdtAmount, setUsdtAmount] = useState("");
  const [solmanAmount, setSolmanAmount] = useState("");

  // When USDT changes, update SOLMAN
  const handleUsdtChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setUsdtAmount(value);
    const num = parseFloat(value);
    const solman = num && num > 0 && pricePerToken ? (num / pricePerToken).toFixed(4) : "";
    setSolmanAmount(solman);
    if (onChange) onChange({ usdtAmount: value, solmanAmount: solman });
  };

  // When SOLMAN changes, update USDT
  const handleSolmanChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setSolmanAmount(value);
    const num = parseFloat(value);
    const usdt = num && num > 0 && pricePerToken ? (num * pricePerToken).toFixed(4) : "";
    setUsdtAmount(usdt);
    if (onChange) onChange({ usdtAmount: usdt, solmanAmount: value });
  };

  return (
    <div className="grid gap-4 grid-cols-2 mt-4">
      <div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="font-semibold text-black">You send</span>
          <span className="text-black">{(Math.ceil(Number(userUsdcBalance) * 100) / 100).toFixed(2)} USDC</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-black bg-transparent focus-within:border-2 focus-within:border-black">
          <input
            className="outline-none w-[65%] bg-transparent p-3 placeholder:text-black"
            placeholder={`0`}
            value={usdtAmount}
            onChange={handleUsdtChange}
          />
          <div className="flex items-center gap-1 pr-2">
            <img src="./usdc-logo.png" alt="USDC" className="w-6 h-6 object-contain" />
            <span className="m-text font-bold">USDC</span>
          </div>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="font-semibold text-black">You’ll receive</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-black bg-transparent focus-within:border-2 focus-within:border-black">
          <input
            className="outline-none w-[65%] bg-transparent p-3 placeholder:text-black"
            placeholder="0"
            value={solmanAmount}
            onChange={handleSolmanChange}
          />
          <div className="flex items-center gap-1 pr-5">
            <img src="./solman_icon.jpg" alt="SOLMAN" className="w-6 h-6 object-contain" />
            <span className="m-text font-bold">SOLMAN</span>
          </div>
        </div>
      </div>
    </div>
  );
}
