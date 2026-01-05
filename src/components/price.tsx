import { cn } from "@/lib/utils";

interface PriceProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Price = ({
  price,
  originalPrice,
  currency = "৳",
  size = "md",
  className,
}: PriceProps) => {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const originalSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const formatPrice = (amount: number) => {
    return `${currency}${amount.toLocaleString()}`;
  };

  const hasDiscount = originalPrice && originalPrice > price;

  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("font-semibold text-primary", sizeClasses[size])}>
        {formatPrice(price)}
      </span>

      {hasDiscount && (
        <>
          <span
            className={cn(
              "text-muted-foreground line-through",
              originalSizeClasses[size]
            )}
          >
            {formatPrice(originalPrice)}
          </span>
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-100">
            -{discountPercentage}% off
          </span>
        </>
      )}
    </div>
  );
};
