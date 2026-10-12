import { describe, expect, it } from "vitest";
import { migrationHintFromError } from "../../src/db/migrationHints.js";

describe("migration hints", () => {
  it("detects missing fairness schema", () => {
    const hint = migrationHintFromError(new Error("relation fairness_commitments does not exist"));
    expect(hint).toContain("002");
  });

  it("detects missing record_bet nonce", () => {
    const hint = migrationHintFromError(new Error("migration_002_required: record_bet"));
    expect(hint).toContain("002");
  });
});
