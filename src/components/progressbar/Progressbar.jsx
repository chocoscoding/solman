const Progressbar = ({ raised, goal, ...props }) => {
  // Calculate progress percentage
  const percent = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
  // Format numbers with commas and 2 decimals
  const format = (n) => n?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="mb-2 w-full" {...props}>
      <p className="text-right font-bold text-black text-sm">
        ${format(raised)} / ${format(goal)}
      </p>
      <div className="relative mt-2 h-3 w-full bg-white rounded">
        <div className="relative h-3 bg-black rounded" style={{ width: `${percent}%`, transition: "width 0.3s" }}>
          <div className="absolute left-0 h-5 w-4 -translate-y-[23%] rounded bg-black"></div>
          <div className="absolute right-0 h-5 w-4 -translate-y-[23%] rounded bg-gradient-to-b from-black to-yellow-800"></div>
        </div>
        {/* Percentage number below current position */}
        <div className="absolute left-0 top-full mt-1 text-xs font-semibold text-black" style={{ left: `calc(${percent}% - 18px)` }}>
          {percent.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

export default Progressbar;
