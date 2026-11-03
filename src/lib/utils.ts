import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Concatena classes condicionais e resolve conflitos do Tailwind.
 * Uso padrão do shadcn: cn("px-2", condicao && "bg-primary")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
