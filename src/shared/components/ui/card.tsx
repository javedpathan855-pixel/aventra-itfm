import cn from "@/shared/utils/cn";
import { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
}

const Card = ({ children, className, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        "p-6 border border-card-border bg-card-background shadow-card backdrop-blur-[14px] rounded-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { Card };
