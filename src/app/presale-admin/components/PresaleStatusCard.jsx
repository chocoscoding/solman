import React from "react";
import Progressbar from "../../../components/progressbar/Progressbar2";
import PresaleCountdown from "./PresaleCountdown";

export default function PresaleStatusCard({ icoData, solPriceInUsdc }) {
  return (
    <div className={`mt-4 p-4 rounded-lg border ${icoData?.isLive ? "bg-gray-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div className="w-full">
          <div className="font-semibold text-lg mb-1">Presale Status</div>
          <div className="grid grid-cols-2 gap-2 text-sm my-2">
            <div>
              <div className="text-gray-600">Total Supply</div>
              <div className="font-medium">{icoData ? icoData.depositTokenAmount.toString() : "--"} tokens</div>
            </div>
            <div>
              <div className="text-gray-600">Tokens Sold</div>
              <div className="font-medium">{icoData?.soldTokenAmount ? (icoData.soldTokenAmount / 1e6).toString() : "0"} tokens</div>
            </div>
            <div>
              <div className="text-gray-600">Token Price</div>
              <div className="font-medium">
                {icoData?.pricePerToken ?? "--"} USDC
                {solPriceInUsdc && icoData?.pricePerToken && (
                  <span className="ml-2 text-xs text-gray-500">(~{(icoData.pricePerToken / solPriceInUsdc).toFixed(4)} SOL)</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Available</div>
              <div className="font-medium">
                {icoData ? (icoData.depositTokenAmount - icoData.soldTokenAmount / 1e6).toString() : "--"} tokens
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 sm:mt-0">
        {icoData?.isLive ? (
          <PresaleCountdown startTime={icoData.startTime} endTime={icoData.endTime} />
        ) : (
          <div className="text-center font-medium text-red-600">Presale is not live yet</div>
        )}
      </div>
      {icoData && (
        <div className="mt-4">
          <Progressbar
            done={
              icoData.depositTokenAmount && Number(icoData.depositTokenAmount) !== 0
                ? (parseFloat(icoData.soldTokenAmount ?? 0) / parseFloat(icoData.depositTokenAmount)) * 100
                : 0
            }
          />
        </div>
      )}
    </div>
  );
}
