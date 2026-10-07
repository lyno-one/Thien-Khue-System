import { HttpException } from "@nestjs/common";
import { GioiHanTanSuat } from "../../src/common/utils/ho-so";

describe("GioiHanTanSuat", () => {
  it("vuot so lan trong cua so -> 429, het cua so thi mo lai", () => {
    let nay = 1_000_000;
    const gh = new GioiHanTanSuat(2, 60_000, () => nay);
    gh.kiem("ip:1");
    gh.kiem("ip:1");
    try {
      gh.kiem("ip:1");
      throw new Error("phai nem");
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(429);
    }
    gh.kiem("ip:2"); // khoa khac khong anh huong
    nay += 60_001;
    expect(() => gh.kiem("ip:1")).not.toThrow();
  });
});
