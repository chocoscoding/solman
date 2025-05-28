"use client";
import { BN } from "@coral-xyz/anchor";
import { useEffect, useState } from "react";

const PresaleCountdown = ({ startTime, endTime }) => {
  const [label, setLabel] = useState("");
  const [time, setTime] = useState({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
  });
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!startTime || !endTime) {
      setLabel("");
      setTime({ days: "00", hours: "00", minutes: "00", seconds: "00" });
      setEnded(false);
      return;
    }
    let interval;
    function updateCountdown() {
      const now = Date.now();
      const start = new Date(new BN(startTime).toNumber());
      const end = new Date(new BN(endTime).toNumber());
      let target, newLabel;

      if (now < start) {
        target = start;
        newLabel = "Presale starts in";
        setEnded(false);
      } else if (now < end) {
        target = end;
        newLabel = "Presale ends in";
        setEnded(false);
      } else {
        setLabel("");
        setEnded(true);
        setTime({ days: "00", hours: "00", minutes: "00", seconds: "00" });
        return;
      }

      const diff = target - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setLabel(newLabel);
      setTime({
        days: days.toString().padStart(2, "0"),
        hours: hours.toString().padStart(2, "0"),
        minutes: minutes.toString().padStart(2, "0"),
        seconds: seconds.toString().padStart(2, "0"),
      });
    }
    updateCountdown();
    interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  if (ended) {
    return (
      <div className="w-full flex flex-col items-center my-4">
        <div className="bg-black text-[#E7FF53] font-bold text-lg rounded-lg px-6 py-3 text-center">
          Presale ended, You can now claim your $SOLMAN
        </div>
      </div>
    );
  }

  if (!label) return null;
  return (
    <div className="w-full flex flex-col items-center my-4">
      <div className="text-black font-bold text-lg mb-2">{label}</div>
      <div className="w-full border-t border-black mb-2"></div>
      <div className="flex justify-center gap-6 mb-1">
        <span className="text-black font-semibold text-sm">Days</span>
        <span className="text-black font-semibold text-sm">Hours</span>
        <span className="text-black font-semibold text-sm">Minutes</span>
        <span className="text-black font-semibold text-sm">Seconds</span>
      </div>
      <div className="flex justify-center gap-6">
        <span className="bg-black text-[#E7FF53] font-bold text-xl rounded-lg px-4 py-1 min-w-[48px] text-center">{time.days}</span>
        <span className="bg-black text-[#E7FF53] font-bold text-xl rounded-lg px-4 py-1 min-w-[48px] text-center">{time.hours}</span>
        <span className="bg-black text-[#E7FF53] font-bold text-xl rounded-lg px-4 py-1 min-w-[48px] text-center">{time.minutes}</span>
        <span className="bg-black text-[#E7FF53] font-bold text-xl rounded-lg px-4 py-1 min-w-[48px] text-center">{time.seconds}</span>
      </div>
    </div>
  );
};

export default PresaleCountdown;
