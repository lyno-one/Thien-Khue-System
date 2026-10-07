import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { map, type Observable } from "rxjs";

/** Tra ve kem meta (phan trang...): `return coMeta(ds, taoMetaPhanTrang(...))` */
export class KetQuaCoMeta<T, M> {
  constructor(
    readonly data: T,
    readonly meta: M
  ) {}
}

export function coMeta<T, M>(data: T, meta: M): KetQuaCoMeta<T, M> {
  return new KetQuaCoMeta(data, meta);
}

/** Decimal (tien) / BigInt -> number; giu nguyen Date, Buffer. Tien la so nguyen dong nen khong mat chinh xac. */
export function chuanHoaGiaTri(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v !== "object") return v;
  if (Prisma.Decimal.isDecimal(v)) return (v as Prisma.Decimal).toNumber();
  if (v instanceof Date || Buffer.isBuffer(v)) return v;
  if (Array.isArray(v)) return v.map(chuanHoaGiaTri);
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return v;
  const kq: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) kq[k] = chuanHoaGiaTri(x);
  return kq;
}

/** Boc moi response thanh cong thanh { data, meta? } (cung dang CRM Lyno) */
@Injectable()
export class BaoResponseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map(kq => {
        if (kq instanceof KetQuaCoMeta) return { data: chuanHoaGiaTri(kq.data), meta: chuanHoaGiaTri(kq.meta) };
        return { data: chuanHoaGiaTri(kq ?? null) };
      })
    );
  }
}
