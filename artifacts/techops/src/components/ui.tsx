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
      primary: "bg-gradient-to-b from-cyan-400 to-cyan-600 text-showroom-dark shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/30 border border-cyan-500/50",
      secondary: "bg-showroom-surface text-slate-200 border border-showroom-border shadow-sm hover:bg-showroom-card hover:border-cyan-500/20",
      outline: "bg-transparent text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10",
      ghost: "bg-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200",
      destructive: "bg-gradient-to-b from-red-500 to-red-700 text-white shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 border border-red-600/50",
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
  <div className={cn("glass-card rounded-2xl overflow-hidden laminated-hover", className)} {...props}>
    {children}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex w-full bg-showroom-panel px-4 py-3 text-sm transition-all duration-200",
          "border border-showroom-border rounded-xl",
          "placeholder:text-slate-500 text-slate-200",
          "focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10",
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
    default: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    neutral: "bg-white/5 text-slate-400 border-white/10",
  };
  
  return (
    <span className={cn("px-2.5 py-1 rounded-md text-xs font-semibold border", variants[variant], className)}>
      {children}
    </span>
  );
};
