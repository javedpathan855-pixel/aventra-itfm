import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Variants } from "framer-motion";
import {
  orgCardStaggerVariants,
  orgDialogBackdropVariants,
  orgDialogPanelVariants,
  orgPageStaggerVariants,
  orgSectionItemVariants,
  orgTabContentVariants,
} from "../variants/organization";
import { DURATIONS } from "../tokens/durations";
import { EASINGS } from "../tokens/easings";

// Architectural constraints for Organization animations:
// - transform/opacity only (GPU-friendly, no layout properties)
// - durations/easings must come from shared tokens (no magic numbers)
// - staggered entrances must define orchestration timing
// - dialog panels must stay near full scale (subtle zoom only)

const ALLOWED_ANIMATED_KEYS = new Set(["opacity", "x", "y", "scale"]);
const KNOWN_DURATIONS = new Set<number>(Object.values(DURATIONS));
const KNOWN_EASINGS = new Set<string>(Object.values(EASINGS).map((e) => JSON.stringify(e)));

type PlainVariant = Record<string, unknown>;

const asPlain = (variant: unknown): PlainVariant => variant as PlainVariant;

const animatedKeysOf = (variants: Variants): string[] => {
  const keys = new Set<string>();
  for (const state of ["initial", "animate", "exit"] as const) {
    const plain = asPlain(variants[state]);
    if (!plain) continue;
    for (const key of Object.keys(plain)) {
      if (key !== "transition") keys.add(key);
    }
  }
  return [...keys];
};

const transitionsOf = (variants: Variants): Record<string, unknown>[] => {
  const found: Record<string, unknown>[] = [];
  for (const state of ["initial", "animate", "exit"] as const) {
    const plain = asPlain(variants[state]);
    const transition = plain?.transition;
    if (transition && typeof transition === "object") {
      found.push(transition as Record<string, unknown>);
    }
  }
  return found;
};

describe("Organization animation variants", () => {
  const animatedVariants: Variants[] = [
    orgSectionItemVariants,
    orgTabContentVariants,
    orgDialogBackdropVariants,
    orgDialogPanelVariants,
  ];

  for (const [index, variants] of animatedVariants.entries()) {
    it(`variant ${index} animates transform/opacity properties only`, () => {
      for (const key of animatedKeysOf(variants)) {
        assert.ok(
          ALLOWED_ANIMATED_KEYS.has(key),
          `unexpected animated property "${key}" (only opacity/x/y/scale allowed)`,
        );
      }
    });

    it(`variant ${index} derives durations and easings from shared tokens`, () => {
      const transitions = transitionsOf(variants);
      assert.ok(transitions.length > 0, "expected at least one transition");
      for (const transition of transitions) {
        assert.ok(
          KNOWN_DURATIONS.has(transition.duration as number),
          `duration ${String(transition.duration)} is not a shared DURATIONS token`,
        );
        assert.ok(
          KNOWN_EASINGS.has(JSON.stringify(transition.ease)),
          `easing ${String(transition.ease)} is not a shared EASINGS token`,
        );
      }
    });
  }

  it("stagger container orchestrates children without animating itself", () => {
    assert.deepEqual(animatedKeysOf(orgPageStaggerVariants), []);
    const transition = asPlain(asPlain(orgPageStaggerVariants).animate).transition as Record<
      string,
      unknown
    >;
    assert.ok(transition, "stagger container must define an animate transition");
    assert.ok(
      typeof transition.staggerChildren === "number" && transition.staggerChildren > 0,
      "stagger container must set a positive staggerChildren",
    );
  });

  it("dialog panel scale stays subtle (matches previous zoom-in-95 treatment)", () => {
    for (const state of ["initial", "exit"] as const) {
      const scale = asPlain(orgDialogPanelVariants[state]).scale as number;
      assert.ok(
        scale >= 0.95 && scale < 1,
        `dialog ${state} scale should be a subtle shrink (got ${String(scale)})`,
      );
    }
    assert.equal(asPlain(orgDialogPanelVariants.animate).scale, 1);
  });

  it("tab content exits in the opposite direction of its entrance", () => {
    const initialX = asPlain(orgTabContentVariants.initial).x as number;
    const exitX = asPlain(orgTabContentVariants.exit).x as number;
    assert.ok(initialX !== 0 && exitX !== 0, "tab transitions need horizontal direction");
    assert.ok(
      Math.sign(initialX) !== Math.sign(exitX),
      "tab exit direction must oppose entrance direction",
    );
  });

  it("card stagger stays tight with no added delay", () => {
    assert.deepEqual(animatedKeysOf(orgCardStaggerVariants), []);
    const transition = asPlain(asPlain(orgCardStaggerVariants).animate).transition as Record<
      string,
      unknown
    >;
    assert.ok(transition, "card stagger must define an animate transition");
    const interval = transition.staggerChildren as number;
    assert.ok(
      typeof interval === "number" && interval > 0 && interval <= 0.05,
      `card stagger interval must be short and positive (got ${String(interval)})`,
    );
    assert.ok(
      transition.delayChildren === undefined || transition.delayChildren === 0,
      "card stagger must not add its own delay (page stagger already sequences sections)",
    );
  });

  it("card stagger interval is tighter than the page stagger interval", () => {
    const page = asPlain(asPlain(orgPageStaggerVariants).animate).transition as Record<
      string,
      unknown
    >;
    const cards = asPlain(asPlain(orgCardStaggerVariants).animate).transition as Record<
      string,
      unknown
    >;
    assert.ok(
      (cards.staggerChildren as number) < (page.staggerChildren as number),
      "card cascades must run tighter than section sequencing",
    );
  });
});
