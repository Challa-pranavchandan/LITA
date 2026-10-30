export function HandshakeIcon({ className = "mx-auto text-[#111111]" }: { className?: string }) {
  return (
    <svg
      width="54"
      height="54"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Left Sleeve / Cuff */}
      <rect x="6" y="27" width="10" height="15" rx="1" />
      <line x1="10" y1="27" x2="10" y2="42" />
      {/* Right Sleeve / Cuff */}
      <rect x="48" y="27" width="10" height="15" rx="1" />
      <line x1="54" y1="27" x2="54" y2="42" />
      
      {/* Left hand & thumb */}
      <path d="M16 31 L24 28 C26.5 27 28.5 28.5 29 30.5 C29.5 32 28.5 33.5 27 34.5 L22 38" />
      {/* Right hand & thumb */}
      <path d="M48 31 L40 28 C37.5 27 35.5 28.5 35 30.5 C34.5 32 35.5 33.5 37 34.5 L42 38" />
      
      {/* Interlocking fingers */}
      <path d="M25 36 C28 39 31 42 34 39 C36 37 36 35 34 33" />
      <path d="M28 39 C31 42 34 45 37 42 C39 40 39 38 37 36" />
      <path d="M31 42 C34 45 37 48 40 45 C42 43 42 41 40 39" />
      <path d="M34 45 C37 48 40 50 43 47 C45 45 44 43 42 41" />
      
      {/* Handshake connection wrist lines */}
      <path d="M16 38 L22 41" />
      <path d="M48 38 L42 41" />
    </svg>
  );
}

export function ArtworkSelectionIcon({ className = "mx-auto text-[#111111]" }: { className?: string }) {
  return (
    <svg
      width="54"
      height="54"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Presentation Board / Framed Artwork */}
      <rect x="10" y="10" width="34" height="26" rx="1.5" />
      {/* Artwork inner preview: horizon & sun */}
      <circle cx="21" cy="20" r="3.5" />
      <path d="M14 31 L22 23 L31 31 L36 27 L41 31" />
      {/* Easel Stand Legs */}
      <line x1="20" y1="36" x2="16" y2="52" />
      <line x1="34" y1="36" x2="38" y2="52" />
      <line x1="27" y1="36" x2="27" y2="48" />

      {/* Person 1 (Advisor) */}
      <circle cx="44" cy="38" r="4" />
      <path d="M38 52 C38 47 41 45 44 45 C47 45 50 47 50 52" />

      {/* Person 2 (Client) */}
      <circle cx="53" cy="40" r="3.5" />
      <path d="M48 52 C48 48 51 46.5 53 46.5 C55 46.5 58 48 58 52" />
    </svg>
  );
}

export function DetailsIcon({ className = "mx-auto text-[#111111]" }: { className?: string }) {
  return (
    <svg
      width="54"
      height="54"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Crossed Tool 1: Fine Drawing Compass / Ruler (top-left to bottom-right) */}
      <line x1="12" y1="12" x2="52" y2="52" />
      <path d="M10 14 L14 10 L18 14 L14 18 Z" />
      <path d="M49 49 L53 53 L51 55 L47 51 Z" />

      {/* Crossed Tool 2: Paintbrush / Stylus (top-right to bottom-left) */}
      <line x1="52" y1="12" x2="12" y2="52" />
      {/* Brush tip */}
      <path d="M50 10 L54 14 L50 18 L46 14 Z" />
      <path d="M15 49 L11 53 L13 55 L17 51 Z" />

      {/* Central Globe / Precision sphere */}
      <circle cx="32" cy="32" r="14" />
      {/* Horizontal equator */}
      <line x1="18" y1="32" x2="46" y2="32" />
      {/* Vertical prime meridian */}
      <line x1="32" y1="18" x2="32" y2="46" />
      {/* Curved meridian lines */}
      <ellipse cx="32" cy="32" rx="7.5" ry="14" />
    </svg>
  );
}
