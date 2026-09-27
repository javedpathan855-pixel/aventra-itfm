import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Controller, useForm } from "react-hook-form";
import { Input } from "../input";
import {
  Select,
  computePanelPlacement,
  filterSelectOptions,
  getSelectedOption,
  isSamePlacement,
  moveHighlightIndex,
  resolveOptionVisualState,
  trackPanelPosition,
  type SelectOption,
} from "../select";

const OPTIONS: SelectOption[] = [
  { value: "hq", label: "Head Office", description: "Main operational office" },
  { value: "mum", label: "Mumbai Branch", description: "Western region office" },
  { value: "pune", label: "Pune Branch", disabled: true },
  {
    value: "a-very-long-option-value",
    label: "Bangalore Office With An Exceptionally Long Display Name",
  },
];

const renderSelect = (props: Record<string, unknown> = {}): string =>
  renderToStaticMarkup(
    React.createElement(Select, { options: OPTIONS, ...props }),
  );

describe("Select pure helpers", () => {
  it("resolves the selected option by value", () => {
    assert.equal(getSelectedOption(OPTIONS, "mum")?.label, "Mumbai Branch");
    assert.equal(getSelectedOption(OPTIONS, "missing"), undefined);
    assert.equal(getSelectedOption(OPTIONS, undefined), undefined);
  });

  it("filters options by label, value, and description", () => {
    assert.equal(filterSelectOptions(OPTIONS, "").length, 4);
    assert.equal(filterSelectOptions(OPTIONS, "   ").length, 4);
    const byLabel = filterSelectOptions(OPTIONS, "mumbai");
    assert.deepEqual(
      byLabel.map((option) => option.value),
      ["mum"],
    );
    assert.equal(filterSelectOptions(OPTIONS, "WESTERN")[0]?.value, "mum");
    assert.equal(filterSelectOptions(OPTIONS, "hq")[0]?.value, "hq");
    assert.deepEqual(filterSelectOptions(OPTIONS, "zzz"), []);
  });

  it("moves highlight with wrap-around while skipping disabled options", () => {
    assert.equal(moveHighlightIndex(OPTIONS, -1, "next"), 0);
    assert.equal(moveHighlightIndex(OPTIONS, 0, "next"), 1);
    // Index 2 (Pune) is disabled and must be skipped.
    assert.equal(moveHighlightIndex(OPTIONS, 1, "next"), 3);
    assert.equal(moveHighlightIndex(OPTIONS, 3, "next"), 0);
    assert.equal(moveHighlightIndex(OPTIONS, 0, "previous"), 3);
    assert.equal(moveHighlightIndex(OPTIONS, 3, "previous"), 1);
    assert.equal(moveHighlightIndex(OPTIONS, 5, "next"), 0);
    assert.equal(moveHighlightIndex(OPTIONS, 5, "previous"), 3);
    assert.equal(moveHighlightIndex(OPTIONS, -1, "first"), 0);
    assert.equal(moveHighlightIndex(OPTIONS, -1, "last"), 3);
  });

  it("returns -1 when no option can be highlighted", () => {
    assert.equal(moveHighlightIndex([], -1, "next"), -1);
    const allDisabled: SelectOption[] = [
      { value: "a", label: "A", disabled: true },
      { value: "b", label: "B", disabled: true },
    ];
    assert.equal(moveHighlightIndex(allDisabled, -1, "next"), -1);
    assert.equal(moveHighlightIndex(allDisabled, 0, "first"), -1);
  });
});

describe("Select rendering", () => {
  it("renders the placeholder when nothing is selected", () => {
    const html = renderSelect({ placeholder: "Select location" });
    assert.ok(html.includes("Select location"));
    assert.ok(html.includes('role="combobox"'));
    assert.ok(html.includes('aria-expanded="false"'));
  });

  it("displays the selected option label instead of the placeholder", () => {
    const html = renderSelect({ value: "mum", placeholder: "Select location" });
    assert.ok(html.includes("Mumbai Branch"));
    assert.ok(!html.includes("Select location"));
  });

  it("supports uncontrolled defaultValue selection", () => {
    const html = renderSelect({ defaultValue: "hq" });
    assert.ok(html.includes("Head Office"));
  });

  it("renders sizes with matching trigger heights", () => {
    assert.ok(renderSelect({ size: "sm" }).includes("h-8"));
    assert.ok(renderSelect({ size: "md" }).includes("h-10"));
    assert.ok(renderSelect({ size: "lg" }).includes("h-12"));
  });

  it("renders the disabled state without interaction affordances", () => {
    const html = renderSelect({ disabled: true });
    assert.ok(html.includes("disabled"));
    assert.ok(html.includes("cursor-not-allowed"));
  });

  it("renders invalid state with role=alert error message", () => {
    const html = renderSelect({ error: "Please select a location." });
    assert.ok(html.includes("Please select a location."));
    assert.ok(html.includes('role="alert"'));
    assert.ok(html.includes("border-error"));
    assert.ok(html.includes('aria-invalid="true"'));
  });

  it("renders helper text linked for assistive technology", () => {
    const html = renderSelect({ id: "loc", helperText: "Choose wisely." });
    assert.ok(html.includes("Choose wisely."));
    assert.ok(html.includes('id="loc-helper"'));
    assert.ok(html.includes('aria-describedby="loc-helper"'));
  });

  it("associates visible labels with the trigger", () => {
    const html = renderSelect({ id: "loc", label: "Location" });
    assert.ok(html.includes('for="loc"'));
    assert.ok(html.includes(">Location<"));
  });

  it("marks required controls for assistive technology", () => {
    const html = renderSelect({ required: true });
    assert.ok(html.includes('aria-required="true"'));
  });
});

describe("Select open panel", () => {
  it("renders options with descriptions and selection state", () => {
    const html = renderSelect({ defaultOpen: true, value: "hq" });
    assert.ok(html.includes('role="listbox"'));
    assert.ok(html.includes("Main operational office"));
    assert.ok(html.includes('aria-selected="true"'));
  });

  it("renders disabled options as unavailable", () => {
    const html = renderSelect({ defaultOpen: true });
    assert.ok(html.includes("Pune Branch"));
    assert.ok(html.includes('aria-disabled="true"'));
  });

  it("renders the search field when searchable", () => {
    const html = renderSelect({ defaultOpen: true, searchable: true });
    assert.ok(html.includes('role="searchbox"'));
    assert.ok(html.includes('placeholder="Search..."'));
  });

  it("renders the empty state when no options exist", () => {
    const html = renderSelect({ defaultOpen: true, options: [] });
    assert.ok(html.includes("No options available"));
    assert.ok(html.includes('role="status"'));
  });

  it("renders a custom empty message", () => {
    const html = renderSelect({
      defaultOpen: true,
      options: [],
      emptyMessage: "Nothing here yet",
    });
    assert.ok(html.includes("Nothing here yet"));
  });

  it("renders long labels in full on a single line without truncation", () => {
    const html = renderSelect({ value: "a-very-long-option-value" });
    assert.ok(html.includes("Bangalore Office With An Exceptionally Long Display Name"));
    assert.ok(html.includes('title="Bangalore Office With An Exceptionally Long Display Name"'));
  });

  it("keeps the panel closed by default", () => {
    const html = renderSelect({});
    assert.ok(!html.includes('role="listbox"'));
  });
});

describe("Select/Input visual parity", () => {
  const PARITY_TOKENS = [
    "h-10",
    "rounded-md",
    "border-card-border",
    "bg-card-background",
    "text-sm",
  ];

  it("shares outer dimensions, border, radius, and typography with Input", () => {
    const selectHtml = renderSelect({});
    const inputHtml = renderToStaticMarkup(React.createElement(Input, {}));
    for (const token of PARITY_TOKENS) {
      assert.ok(selectHtml.includes(token), `select missing ${token}`);
      assert.ok(inputHtml.includes(token), `input missing ${token}`);
    }
  });

  it("shares the sm footprint with small Inputs", () => {
    const selectHtml = renderSelect({ size: "sm" });
    const inputHtml = renderToStaticMarkup(
      React.createElement(Input, { inputSize: "sm" }),
    );
    for (const token of ["h-8", "text-xs", "rounded"]) {
      assert.ok(selectHtml.includes(token), `select missing ${token}`);
      assert.ok(inputHtml.includes(token), `input missing ${token}`);
    }
  });

  it("shares focus and invalid treatment with Input", () => {
    const selectHtml = renderSelect({ error: "Required." });
    const inputHtml = renderToStaticMarkup(
      React.createElement(Input, { error: "Required." }),
    );
    for (const token of ["border-error", "focus:border-error"]) {
      assert.ok(selectHtml.includes(token), `select missing ${token}`);
      assert.ok(inputHtml.includes(token), `input missing ${token}`);
    }
  });

  it("matches Input focus glow and error glow treatments", () => {
    const selectHtml = renderSelect({ error: "Required." });
    const inputHtml = renderToStaticMarkup(
      React.createElement(Input, { error: "Required." }),
    );
    const plainSelectHtml = renderSelect({});
    const plainInputHtml = renderToStaticMarkup(React.createElement(Input, {}));
    // Non-error controls share the primary focus treatment…
    assert.ok(plainSelectHtml.includes("focus:border-primary"));
    assert.ok(plainInputHtml.includes("focus:border-primary"));
    assert.ok(
      plainSelectHtml.includes("0_0_20px_rgba(74,99,216,0.25)"),
      "select must mirror Input focus glow",
    );
    // …while invalid controls share the error treatment instead
    // (tailwind-merge resolves the conflict identically on both).
    assert.ok(
      selectHtml.includes("0_0_22px_rgba(244,63,94,0.25)"),
      "select must mirror Input error glow",
    );
    assert.ok(
      inputHtml.includes("0_0_22px_rgba(244,63,94,0.25)"),
      "input error glow must remain intact",
    );
  });
});

describe("Input original design lock", () => {
  // Guards the visual reference itself: if Input's rendered classes ever
  // drift, Select parity assertions above become meaningless.
  it("retains original dimensions, border, radius, and placeholder", () => {
    const html = renderToStaticMarkup(React.createElement(Input, {}));
    for (const token of [
      "h-10",
      "rounded-md",
      "border-card-border",
      "bg-card-background",
      "shadow-card",
      "text-sm",
      "placeholder:text-muted-foreground",
    ]) {
      assert.ok(html.includes(token), `input changed, missing ${token}`);
    }
  });

  it("retains original focus treatment", () => {
    const html = renderToStaticMarkup(React.createElement(Input, {}));
    assert.ok(html.includes("focus:border-primary"));
    assert.ok(
      html.includes("linear-gradient(145deg,rgba(46,65,115,0.10)"),
      "input focus wash must remain intact",
    );
    assert.ok(html.includes("hover:border-border-strong"));
  });

  it("retains original disabled and invalid treatment", () => {
    const disabledHtml = renderToStaticMarkup(
      React.createElement(Input, { disabled: true }),
    );
    assert.ok(disabledHtml.includes("cursor-not-allowed"));
    assert.ok(disabledHtml.includes("opacity-50"));
    const errorHtml = renderToStaticMarkup(
      React.createElement(Input, { error: "Bad." }),
    );
    assert.ok(errorHtml.includes("border-error"));
    assert.ok(errorHtml.includes('role="alert"'));
  });
});

describe("Select panel placement", () => {
  it("opens below the trigger when space allows", () => {
    const placement = computePanelPlacement(
      { top: 100, bottom: 140, left: 50, width: 200 },
      200,
      { width: 1280, height: 800 },
    );
    assert.equal(placement.upward, false);
    assert.equal(placement.top, 148);
    assert.equal(placement.left, 50);
    assert.equal(placement.width, 200);
  });

  it("flips above the trigger near the viewport bottom", () => {
    const placement = computePanelPlacement(
      { top: 700, bottom: 740, left: 50, width: 200 },
      200,
      { width: 1280, height: 800 },
    );
    assert.equal(placement.upward, true);
    assert.equal(placement.top, 700 - 200 - 8);
    assert.equal(placement.width, 200);
  });

  it("clamps horizontally inside the viewport", () => {
    const right = computePanelPlacement(
      { top: 100, bottom: 140, left: 1150, width: 200 },
      100,
      { width: 1280, height: 800 },
    );
    assert.ok(right.left + right.width <= 1280 - 8);
    const left = computePanelPlacement(
      { top: 100, bottom: 140, left: -20, width: 200 },
      100,
      { width: 1280, height: 800 },
    );
    assert.ok(left.left >= 8);
  });

  it("caps panel height and keeps a minimum top edge", () => {
    const placement = computePanelPlacement(
      { top: 10, bottom: 50, left: 50, width: 200 },
      9999,
      { width: 1280, height: 800 },
    );
    assert.equal(placement.upward, false);
    assert.ok(placement.top >= 8);
  });

  it("renders the open panel fixed-positioned above page content", () => {
    const html = renderSelect({ defaultOpen: true });
    assert.ok(html.includes("position:fixed") || html.includes("position: fixed"));
    assert.ok(html.includes("z-index:50") || html.includes("z-index: 50"));
    assert.ok(html.includes('role="listbox"'));
  });

  it("keeps scroll tracking dimensionally stable", () => {
    // Simulates consecutive scroll frames with an identical trigger rect:
    // tracking must return the same top/left so no state update follows.
    const frame = (top: number, bottom: number) =>
      trackPanelPosition(
        { top, bottom, left: 50, width: 200 },
        200,
        220,
        false,
        { width: 1280, height: 800 },
      );
    assert.deepEqual(frame(100, 140), frame(100, 140));
    assert.deepEqual(frame(100, 140), { top: 148, left: 50 });
  });

  it("tracks the trigger without flipping direction mid-scroll", () => {
    // The open-time upward decision sticks: scrolling the trigger toward
    // the viewport bottom must not teleport the panel above it.
    const below = trackPanelPosition(
      { top: 700, bottom: 740, left: 50, width: 200 },
      200,
      220,
      false,
      { width: 1280, height: 800 },
    );
    assert.deepEqual(below, { top: 748, left: 50 });
    const above = trackPanelPosition(
      { top: 700, bottom: 740, left: 50, width: 200 },
      200,
      220,
      true,
      { width: 1280, height: 800 },
    );
    assert.deepEqual(above, { top: 700 - 200 - 8, left: 50 });
  });

  it("clamps tracked position inside the viewport", () => {
    const right = trackPanelPosition(
      { top: 100, bottom: 140, left: 1150, width: 200 },
      100,
      200,
      false,
      { width: 1280, height: 800 },
    );
    assert.ok(right.left + 200 <= 1280 - 8);
    const topEdge = trackPanelPosition(
      { top: -50, bottom: -10, left: 50, width: 200 },
      100,
      200,
      true,
      { width: 1280, height: 800 },
    );
    assert.ok(topEdge.top >= 8);
  });

  it("detects identical placements so scroll frames skip state updates", () => {
    assert.equal(isSamePlacement(null, null), true);
    assert.equal(
      isSamePlacement(null, { top: 1, left: 2, width: 3, upward: false }),
      false,
    );
    assert.equal(
      isSamePlacement(
        { top: 148, left: 50, width: 220, upward: false },
        { top: 148, left: 50, width: 220, upward: false },
      ),
      true,
    );
    assert.equal(
      isSamePlacement(
        { top: 148, left: 50, width: 220, upward: false },
        { top: 149, left: 50, width: 220, upward: false },
      ),
      false,
    );
    assert.equal(
      isSamePlacement(
        { top: 148, left: 50, width: 220, upward: false },
        { top: 148, left: 50, width: 260, upward: false },
      ),
      false,
    );
  });

  it("does not alter surrounding layout: the panel is out of flow", () => {
    const html = renderSelect({ defaultOpen: true, value: "mum" });
    // No absolute-positioned in-flow panel that siblings must paint around.
    assert.ok(!html.includes("top-full"));
    assert.ok(!html.includes("bottom-full"));
  });
});

describe("Select option visual states", () => {
  it("always prefers the selected treatment, never hover", () => {
    assert.equal(
      resolveOptionVisualState({ selected: true, hovered: true, keyboardActive: true }),
      "selected",
    );
    assert.equal(
      resolveOptionVisualState({ selected: true, hovered: false, keyboardActive: false }),
      "selected",
    );
  });

  it("shows hover only for the row under the pointer", () => {
    assert.equal(
      resolveOptionVisualState({ selected: false, hovered: true, keyboardActive: true }),
      "hover",
    );
    assert.equal(
      resolveOptionVisualState({ selected: false, hovered: true, keyboardActive: false }),
      "hover",
    );
  });

  it("shows an independent keyboard indicator otherwise", () => {
    assert.equal(
      resolveOptionVisualState({ selected: false, hovered: false, keyboardActive: true }),
      "keyboard",
    );
    assert.equal(
      resolveOptionVisualState({ selected: false, hovered: false, keyboardActive: false }),
      "default",
    );
  });
});

describe("Select fresh-open rendering", () => {
  it("applies no hover background before any pointer interaction", () => {
    const html = renderSelect({ defaultOpen: true, value: "mum" });
    assert.ok(!html.includes("bg-surface-muted/60"));
  });

  it("keeps the selected check independent of hover state", () => {
    const html = renderSelect({ defaultOpen: true, value: "mum" });
    // Selected row carries the check and selected background…
    assert.ok(html.includes("Mumbai Branch"));
    assert.ok(html.includes("bg-primary-muted"));
    // …while no other row carries hover or keyboard styling.
    assert.ok(!html.includes("bg-surface-muted/60"));
    assert.ok(!html.includes("ring-inset"));
  });

  it("renders option labels on a single line without truncation", () => {
    const html = renderSelect({ defaultOpen: true });
    // Labels never wrap; descriptions may still truncate inside the panel.
    assert.ok(html.includes("block whitespace-nowrap"));
  });

  it("bounds long lists in a scrollable panel", () => {
    const html = renderSelect({ defaultOpen: true });
    // Height is capped with vertical scrolling; horizontal overflow is
    // hidden because the portal width already fits the content.
    assert.ok(html.includes("max-h-64"));
    assert.ok(html.includes("overflow-y-auto"));
    assert.ok(html.includes("overflow-x-hidden"));
  });

  it("reflects controlled value updates across renders", () => {
    const before = renderSelect({ value: "hq" });
    const after = renderSelect({ value: "mum" });
    assert.ok(before.includes("Head Office"));
    assert.ok(!before.includes("Mumbai Branch"));
    assert.ok(after.includes("Mumbai Branch"));
    assert.ok(!after.includes("Head Office"));
  });
});

describe("Select form integration", () => {
  it("binds to React Hook Form Controller values", () => {
    const Probe = () => {
      const form = useForm({ defaultValues: { department: "eng" } });
      return React.createElement(Controller<{ department: string }>, {
        control: form.control,
        name: "department",
        render: ({ field }) =>
          React.createElement(Select, {
            options: [
              { value: "eng", label: "Engineering" },
              { value: "ops", label: "Operations" },
            ],
            value: field.value,
            onChange: field.onChange,
            onBlur: field.onBlur,
            name: field.name,
            "aria-label": "Department",
          }),
      });
    };
    const html = renderToStaticMarkup(React.createElement(Probe));
    assert.ok(html.includes("Engineering"));
    assert.ok(html.includes('name="department"'));
    assert.ok(html.includes('role="combobox"'));
  });
});

describe("Select panel content-aware placement", () => {
  it("grows the panel to fit content wider than the trigger", () => {
    const placement = computePanelPlacement(
      { top: 100, bottom: 140, left: 50, width: 200 },
      200,
      { width: 1280, height: 800 },
      8,
      420,
    );
    assert.equal(placement.width, 420);
    assert.equal(placement.left, 50);
    assert.equal(placement.upward, false);
  });

  it("never shrinks below the trigger width", () => {
    const placement = computePanelPlacement(
      { top: 100, bottom: 140, left: 50, width: 200 },
      200,
      { width: 1280, height: 800 },
      8,
      120,
    );
    assert.equal(placement.width, 200);
  });

  it("clamps content width to the viewport", () => {
    const placement = computePanelPlacement(
      { top: 100, bottom: 140, left: 50, width: 200 },
      200,
      { width: 400, height: 800 },
      8,
      2000,
    );
    assert.ok(placement.width <= 400 - 16);
    assert.ok(placement.left >= 8);
    assert.ok(placement.left + placement.width <= 400);
  });
});
