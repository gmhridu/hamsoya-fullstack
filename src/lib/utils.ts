import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


import { RedisService } from "./redis";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

