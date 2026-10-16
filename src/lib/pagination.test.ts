import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT } from "../constants";
import { paginate } from "./pagination";

describe("pagination", () => {
  it("appends requested blank pages after the document pages", () => {
    const result = paginate([], DEFAULT_LAYOUT, 2);

    expect(result.pages).toEqual([[], []]);
  });

  it("ignores negative blank page counts", () => {
    const result = paginate([], DEFAULT_LAYOUT, -1);

    expect(result.pages).toEqual([]);
  });
});
