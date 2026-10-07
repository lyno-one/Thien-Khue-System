/** Jest: unit test khong can DB — test/<module>/*.spec.ts, Prisma mock */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  moduleFileExtensions: ["js", "json", "ts"],
  testRegex: "test/.*\\.spec\\.ts$",
  // tsconfig.spec.json bat isolatedModules -> ts-jest chi transpile (nhanh); kiem kieu bang `pnpm --filter api typecheck`
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.spec.json" }] },
  collectCoverageFrom: ["src/**/*.ts"],
  clearMocks: true
};
