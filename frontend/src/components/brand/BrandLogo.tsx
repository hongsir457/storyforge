interface BrandLogoProps {
  alt: string;
  className?: string;
  variant?: "full" | "mark";
}

function SparkMark({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 96 96"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="88" height="88" rx="21" fill="#1897D6" />
      <path
        d="M44.8 27.6L49.7 41.1L63.2 46L49.7 50.9L44.8 64.4L39.9 50.9L26.4 46L39.9 41.1L44.8 27.6Z"
        fill="white"
      />
      <path
        d="M67.8 21L70.4 28L77.4 30.6L70.4 33.2L67.8 40.2L65.2 33.2L58.2 30.6L65.2 28L67.8 21Z"
        fill="white"
      />
      <path
        d="M66.2 50L68.1 55.1L73.2 57L68.1 58.9L66.2 64L64.3 58.9L59.2 57L64.3 55.1L66.2 50Z"
        fill="white"
      />
    </svg>
  );
}

export function BrandLogo({ alt, className, variant = "full" }: BrandLogoProps) {
  if (variant === "mark") {
    return (
      <span role="img" aria-label={alt} className={className}>
        <SparkMark className="h-full w-full" />
      </span>
    );
  }

  return (
    <svg
      role="img"
      aria-label={alt}
      viewBox="0 0 620 180"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(8 24)">
        <rect x="4" y="4" width="124" height="124" rx="28" fill="#1897D6" />
        <path
          d="M61.1 37.2L68 56.2L87 63.1L68 70L61.1 89L54.2 70L35.2 63.1L54.2 56.2L61.1 37.2Z"
          fill="white"
        />
        <path
          d="M93.4 28L97.1 37.9L107 41.6L97.1 45.3L93.4 55.2L89.7 45.3L79.8 41.6L89.7 37.9L93.4 28Z"
          fill="white"
        />
        <path
          d="M91.2 68.6L94 76.1L101.5 78.9L94 81.7L91.2 89.2L88.4 81.7L80.9 78.9L88.4 76.1L91.2 68.6Z"
          fill="white"
        />
      </g>
      <text
        x="166"
        y="88"
        fill="#0F1B37"
        fontFamily="var(--font-display), var(--font-sans), sans-serif"
        fontSize="66"
        fontWeight="700"
        letterSpacing="-0.05em"
      >
        Frametale
      </text>
      <text
        x="166"
        y="132"
        fill="#7A8598"
        fontFamily="var(--font-sans), sans-serif"
        fontSize="30"
        fontWeight="700"
        letterSpacing="0.02em"
      >
        {"\u53D9\u5F71\u5DE5\u5382"}
      </text>
    </svg>
  );
}
