import { describe, expect, it } from "vitest";
import { commandBuilders } from "../../src/commands/definitions.js";

describe("slash command definitions", () => {
  it("serializes every command for Discord registration", () => {
    for (const builder of commandBuilders) {
      expect(() => builder.toJSON()).not.toThrow();
    }
  });

  it("includes casino and play entry points", () => {
    const names = commandBuilders.map((b) => b.name);
    expect(names).toContain("casino");
    expect(names).toContain("play");
  });
});
