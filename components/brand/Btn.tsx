import type { CSSProperties, ReactNode } from "react";

type Kind = "wine" | "accent" | "gold" | "spotify" | "ghost";

type Props = {
  kind?: Kind;
  block?: boolean;
  disabled?: boolean;
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  style?: CSSProperties;
  className?: string;
};

// CTA "Nuit de vinyle" — s'appuie sur les classes .tb-btn (cf. globals.css).
export function Btn({
  kind = "accent",
  block,
  disabled,
  children,
  icon,
  onClick,
  type = "button",
  style = {},
  className = "",
}: Props) {
  return (
    <button
      type={type}
      className={`tb-btn tb-btn--${kind}${block ? " tb-btn--block" : ""} ${className}`}
      disabled={disabled}
      onClick={onClick}
      style={style}
    >
      {icon && <span style={{ display: "inline-flex", fontSize: "0.9em" }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
