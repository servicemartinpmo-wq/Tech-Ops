import React, { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap active:scale-[0.98]";
    
    const variants = {
      primary: "bg-gradient-to-b from-primary to-blue-700 text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 border border-blue-600",
      secondary: "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300",
      outline: "bg-transparent text-primary border border-primary/20 hover:bg-primary/5",
      ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      destructive: "bg-gradient-to-b from-destructive to-red-600 text-white shadow-md shadow-destructive/20 hover:shadow-lg hover:shadow-destructive/30 border border-red-600",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm rounded-lg",
      md: "h-11 px-6 text-sm rounded-xl",
      lg: "h-14 px-8 text-base rounded-2xl",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("glass-card rounded-2xl overflow-hidden", className)} {...props}>
    {children}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex w-full bg-white px-4 py-3 text-sm transition-all duration-200",
          "border border-slate-200 rounded-xl",
          "placeholder:text-slate-400 text-slate-900",
          "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Badge = ({ children, variant = "default", className }: { children: React.ReactNode, variant?: "default" | "success" | "warning" | "error" | "neutral", className?: string }) => {
  const variants = {
    default: "bg-primary/10 text-primary border-primary/20",
    success: "bg-green-100 text-green-700 border-green-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    error: "bg-red-100 text-red-700 border-red-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
  };
  
  return (
    <span className={cn("px-2.5 py-1 rounded-md text-xs font-semibold border", variants[variant], className)}>
      {children}
    </span>
  );
};
