import Link from "next/link";

type PrimaryButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "ghost";
};

export function PrimaryButton({
  href,
  children,
  variant = "solid",
}: PrimaryButtonProps) {
  const className = variant === "solid" ? "primary-btn" : "ghost-btn";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
