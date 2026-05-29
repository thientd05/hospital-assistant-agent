import Link from "next/link";

type Props = {
  variant?: "default" | "light";
  href?: string | null;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export function BrandMark({ variant = "default", href = "/", className = "", onClick }: Props) {
  const isLight = variant === "light";
  const textColor = isLight ? "text-white" : "text-slate-900";
  const accent = isLight ? "text-brand-200" : "text-brand-600";

  const content = (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${textColor} ${className}`}>
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
          isLight ? "bg-white/15 ring-1 ring-white/30" : "bg-brand-600 text-white"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 4v16M4 12h16" />
          <circle cx="12" cy="12" r="9" strokeWidth="1.4" opacity="0.4" />
        </svg>
      </span>
      <span className="text-base sm:text-lg">
        FamilyHealth<span className={accent}>AI</span>
      </span>
    </span>
  );

  if (!href) return content;
  return <Link href={href} onClick={onClick}>{content}</Link>;
}
