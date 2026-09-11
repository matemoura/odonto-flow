import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClassName: Record<ButtonVariant, string> = {
  primary: "odontoflow-btn odontoflow-btn--primary",
  secondary: "odontoflow-btn odontoflow-btn--secondary",
  ghost: "odontoflow-btn odontoflow-btn--ghost",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const classes = [variantClassName[variant], className].filter(Boolean).join(" ");
  return <button className={classes} {...props} />;
}
