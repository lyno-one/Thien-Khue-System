/** Gop class Tailwind co dieu kien: cn("a", dieuKien && "b", undefined) */
export function cn(...lop: (string | false | null | undefined)[]): string {
  return lop.filter(Boolean).join(" ");
}
