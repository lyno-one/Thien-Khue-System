import type { Vai } from "@prisma/client";

/** Vai ban hang duoc phan bo khach / ho tro KOL-KOC */
export type VaiBan = Extract<Vai, "SALE" | "CSKH">;

export const VAI_BAN_HANG: VaiBan[] = ["SALE", "CSKH"];
