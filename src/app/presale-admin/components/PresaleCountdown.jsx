import React, { useState, useEffect } from "react";
import { BN } from "@coral-xyz/anchor";

export default function PresaleCountdown({ startTime, endTime }) {
  const [countdown, setCountdown] = useState("");
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    if (!startTime || !endTime) {
      setCountdown("");
      setIsOver(false);
      return;
    }
    let interval;
    function updateCountdown() {
      const now = Date.now();
      const start = new Date(new BN(startTime).toNumber());
      const end = new Date(new BN(endTime).toNumber());
      let target, label;

      if (now < start) {
        target = start;
        label = "Starts in";
        setIsOver(false);
      } else if (now < end) {
        target = end;
        label = "Ends in";
        setIsOver(false);
      } else {
        setCountdown("");
        setIsOver(true);
        return;
      }

      const diff = target - now;
      if (diff <= 0) {
        setCountdown(`${label}: 00 days 00 hours 00 minutes 00 seconds`);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(
        `${label}: ${days.toString().padStart(2, "0")} days ${hours.toString().padStart(2, "0")} hours ${minutes
          .toString()
          .padStart(2, "0")} minutes ${seconds.toString().padStart(2, "0")} secs`
      );
    }
    updateCountdown();
    interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  if (isOver) {
    return (
      <div className="mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-neutral-100 to-neutral-50 border border-neutral-300 shadow-sm flex flex-col items-center my-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🎉</span>
          <span className="text-xl font-bold text-blue-800">Presale Ended</span>
        </div>
        <div className="text-sm text-gray-600 font-normal text-center">
          <div>
            <span className="font-semibold">Started:</span>{" "}
            {new Date(new BN(startTime).toNumber()).toLocaleString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div>
            <span className="font-semibold">Ended:</span>{" "}
            {new Date(new BN(endTime).toNumber()).toLocaleString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    );
  }
  if (!countdown) return null;
  return <div className="mb-2 text-center text-lg font-bold text-green-700">{countdown}</div>;
}
