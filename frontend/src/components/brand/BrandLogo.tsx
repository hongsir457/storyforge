interface BrandLogoProps {
  alt: string;
  className?: string;
  variant?: "full" | "mark";
}

export function BrandLogo({ alt, className, variant = "full" }: BrandLogoProps) {
  const src = variant === "mark" ? "/storyforge-mark.png" : "/storyforge-logo.png";
  return <img src={src} alt={alt} className={className} />;
}
