import type { CSSProperties } from "react";

type IconProps = { className?: string; style?: CSSProperties };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};



export function IconCube({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 2.5 21 7.5v9L12 21.5 3 16.5v-9L12 2.5Z" />
      <path d="M3 7.5 12 12.5l9-5" />
      <path d="M12 12.5v9" />
    </svg>
  );
}

export function IconMagnet({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 4v7a6 6 0 0 0 12 0V4" />
      <path d="M6 4h4v7a2 2 0 0 0 4 0V4h4" />
      <path d="M6 8h4M14 8h4" />
      <path d="M4 20h.01M9 21h.01M20 20h.01" strokeWidth={2.4} />
    </svg>
  );
}

export function IconKeycard({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...base}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M6 9h4v3H6zM14 9h4M14 12.5h4M6 15.5h6" />
    </svg>
  );
}

export function IconAnt({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="7" r="2.2" />
      <circle cx="12" cy="12.5" r="1.8" />
      <ellipse cx="12" cy="18.5" rx="2.6" ry="3" />
      <path d="M10.2 5.6 8 3.5M13.8 5.6 16 3.5" />
      <path d="M10.4 11.5 6 9.5M10.6 14 5.5 15M13.6 11.5 18 9.5M13.4 14l5.1 1" />
    </svg>
  );
}

export function IconSignal({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 19a15.5 15.5 0 0 1 16-15" />
      <path d="M4 19a10.5 10.5 0 0 1 11-10.5" />
      <path d="M4 19A5.5 5.5 0 0 1 9.5 13.5" />
      <circle cx="4.5" cy="19" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSwap({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
      <circle cx="4.5" cy="16" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="19.5" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="8.5" cy="8" r="3" />
      <path d="M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="16.5" cy="7" r="2.3" />
      <path d="M15.5 14.2c3 .2 6 2.4 6 5.8" />
    </svg>
  );
}

export function IconGhost({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 3a7 7 0 0 1 7 7v10l-2.4-2-2.3 2-2.3-2-2.3 2-2.3-2L5 20V10a7 7 0 0 1 7-7Z" />
      <path d="M9.5 10.5h.01M14.5 10.5h.01" strokeWidth={2.6} />
      <path d="M10.5 14c.9.7 2.1.7 3 0" />
    </svg>
  );
}

export function IconSprout({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 21v-8" />
      <path d="M12 13c0-4 2.5-7 8-7 0 5-3 7-8 7Z" />
      <path d="M12 16c0-3-2-5-6.5-5 0 4 2.5 5 6.5 5Z" />
      <path d="M7 21h10" />
    </svg>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function IconWrench({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M14.5 6.5a4.5 4.5 0 0 0-6 5.6L3 17.5 6.5 21l5.4-5.5a4.5 4.5 0 0 0 5.6-6L14 13l-3-3 3.5-3.5Z" />
    </svg>
  );
}

export function IconCoin({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 2.5 20.2 7v10L12 21.5 3.8 17V7L12 2.5Z" />
      <path d="M14.8 9.2A3.6 3.6 0 1 0 14.8 15" />
    </svg>
  );
}

export function IconBolt({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M13 2.5 4.5 13.5H11L9.5 21.5 19.5 10H12.5L13 2.5Z" />
    </svg>
  );
}

export function IconMap({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" />
      <path d="M9 4v13M15 6.5v13" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="m4.5 12.5 5 5L19.5 7" />
    </svg>
  );
}

export function IconArrow({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 12h15M13.5 5.5 20 12l-6.5 6.5" />
    </svg>
  );
}

export function IconFlag({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 21V4" />
      <path d="M5 4h13l-3.5 4L18 12H5" />
    </svg>
  );
}

export function InsightIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "signal":
      return <IconSignal className={className} />;
    case "swap":
      return <IconSwap className={className} />;
    case "users":
      return <IconUsers className={className} />;
    case "ghost":
      return <IconGhost className={className} />;
    case "sprout":
      return <IconSprout className={className} />;
    default:
      return null;
  }
}

export function GameIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "magnet":
      return <IconMagnet className={className} />;
    case "keycard":
      return <IconKeycard className={className} />;
    case "ant":
      return <IconAnt className={className} />;
    default:
      return null;
  }
}

export function IconBell({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 17h16M5 17a7 7 0 0 1 14 0" />
      <path d="M12 10V7.5M10.5 6h3" />
      <path d="M2.5 20.5h19" />
    </svg>
  );
}

export function IconBroom({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M14.5 3 10 12" />
      <path d="M6 21c.5-3.5 1.5-6.5 4-9l4 2c-1 3-3 5.5-8 7Z" />
      <path d="M9 15.5 7 20M12 17l-1.5 4" />
    </svg>
  );
}

export function IconCart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="4" y="6" width="16" height="9" rx="1" />
      <path d="M4 10h16M9 6V4.5h6V6" />
      <circle cx="8" cy="18.5" r="1.6" />
      <circle cx="16" cy="18.5" r="1.6" />
    </svg>
  );
}

export function IconEye({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconDroplet({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 3.5c3.5 4.5 6.5 8 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 11.5 8.5 8 12 3.5Z" />
      <path d="M9 14.5a3 3 0 0 0 2 3" />
    </svg>
  );
}

export function IconFlame({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 2.5c1 3.5 5 5.5 5 10a5.8 5.8 0 0 1-10 4 5.6 5.6 0 0 1-1-3.5c0-4.5 4-6 6-10.5Z" />
      <path d="M12 21a3 3 0 0 1-3-3c0-2 3-3 3-5.5 0 2.5 3 3.5 3 5.5a3 3 0 0 1-3 3Z" />
    </svg>
  );
}

export function IconMirror({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="6" y="2.5" width="12" height="16" rx="6" />
      <path d="M9.5 8.5c-.8 1.2-1 2.6-.6 4M9 21.5h6" />
    </svg>
  );
}

export function IconClipboard({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="5" y="4" width="14" height="17" rx="1.5" />
      <path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 13.5h7M8.5 17h4" />
    </svg>
  );
}

export function IconElevator({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="4" y="2.5" width="16" height="19" rx="1" />
      <path d="M12 2.5v19" />
      <path d="m8 9 1.8-2L11.5 9M12.5 15l1.8 2 1.7-2" />
    </svg>
  );
}

export function IconDatabase({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </svg>
  );
}

export function IconCode({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 2.5 20 5.5v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-6l8-3Z" />
      <path d="m8.5 11.5 2.5 2.5 4.5-4.5" />
    </svg>
  );
}

export function IconCalendar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3" y="5" width="18" height="16" rx="1.5" />
      <path d="M3 9.5h18M8 3v4M16 3v4" />
      <path d="M7.5 13.5h3M13.5 13.5h3M7.5 17h3" />
    </svg>
  );
}

export function IconTarget({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconBook({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17.5H6.5A2.5 2.5 0 0 0 4 22V4.5Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </svg>
  );
}

export function IconStar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="m12 3 2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8L12 3Z" />
    </svg>
  );
}

export function IconLayers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="m12 2.5 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12.5 9 5 9-5M3 17.5l9 5 9-5" opacity="0.6" />
    </svg>
  );
}

/** Isometric voxel cube rendered as SVG — brand mark & ambient decoration */
export function VoxelCube({
  className,
  color = "#38e1d4",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      <polygon points="50,4 94,27 50,50 6,27" fill={color} opacity="0.95" />
      <polygon points="6,27 50,50 50,100 6,77" fill={color} opacity="0.5" />
      <polygon points="94,27 50,50 50,100 94,77" fill={color} opacity="0.28" />
      <polyline
        points="6,27 50,50 94,27 M50,50 50,100"
        fill="none"
        stroke="rgba(7,13,24,0.55)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
