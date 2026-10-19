"use client";

interface BotanicalBranchProps {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

export function BotanicalBranch({
  className = "",
  style = {},
  color = "rgba(140, 115, 85, 0.45)",
}: BotanicalBranchProps) {
  return (
    <svg
      viewBox="0 0 120 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
      aria-hidden="true"
    >
      <path
        d="M60 170C60 140 55 90 70 30"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Leaves branching left and right */}
      <path
        d="M64 135C50 130 42 118 45 106C54 112 62 122 63 133"
        fill={color}
        fillOpacity="0.4"
        stroke={color}
        strokeWidth="0.8"
      />
      <path
        d="M61 110C72 105 82 95 80 82C72 88 64 98 62 108"
        fill={color}
        fillOpacity="0.4"
        stroke={color}
        strokeWidth="0.8"
      />
      <path
        d="M65 85C52 78 46 66 48 54C56 60 63 70 65 83"
        fill={color}
        fillOpacity="0.4"
        stroke={color}
        strokeWidth="0.8"
      />
      <path
        d="M67 60C76 52 82 40 78 30C70 36 65 48 66 58"
        fill={color}
        fillOpacity="0.4"
        stroke={color}
        strokeWidth="0.8"
      />
      <path
        d="M70 32C68 20 62 10 70 4C74 12 73 22 70 30"
        fill={color}
        fillOpacity="0.4"
        stroke={color}
        strokeWidth="0.8"
      />
    </svg>
  );
}
