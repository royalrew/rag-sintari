import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validerar fil innan uppladdning
 * Kontrollerar att filen finns och har en storlek > 0
 * Detta hanterar problem med molntjänster (OneDrive, iCloud, Google Drive)
 * som ibland ger tomma filer (size 0) när filen inte är nedladdad
 */
export function validateFile(file: File | null | undefined): void {
  if (!file) {
    throw new Error("no-file");
  }

  if (file.size === 0) {
    // Kan betyda: ej nedladdad från moln, avbruten, korrupt
    throw new Error("empty-file");
  }

  // Här kan man lägga till ytterligare valideringar:
  // - maxstorlek (t.ex. 100 MB)
  // - filtyp (t.ex. endast PDF, DOCX, TXT, MD, CSV)
}
