export default function DockLeftIcon({ size = 24, color = "currentColor", flipHorizontal = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: flipHorizontal ? "scaleX(-1)" : "none",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        flexShrink: 0,
      }}
    >
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="8" y1="3" x2="8" y2="21" />
      <line x1="2" y1="9" x2="8" y2="9" />
      <line x1="2" y1="15" x2="8" y2="15" />
    </svg>
  );
}
