import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getWarrantyStatus } from "../domain/services/warranty";
import {
  normalizeAssetName,
  normalizeAssetTag,
  WARRANTY_EXPIRING_SOON_DAYS,
} from "../domain/constants/asset-constants";
import {
  assetCategorySchema,
  assetModelSchema,
  assetSchema,
  assignAssetSchema,
  returnAssetSchema,
} from "../domain/schemas/asset.schema";

const NOW = new Date("2026-09-27T00:00:00Z");

describe("Asset domain — warranty status", () => {
  it("returns NONE without an expiry date", () => {
    assert.equal(getWarrantyStatus(null, NOW), "NONE");
    assert.equal(getWarrantyStatus(new Date("invalid"), NOW), "NONE");
  });

  it("returns ACTIVE well before expiry", () => {
    assert.equal(getWarrantyStatus(new Date("2027-06-01T00:00:00Z"), NOW), "ACTIVE");
  });

  it("returns EXPIRING_SOON within the window", () => {
    assert.equal(
      getWarrantyStatus(
        new Date(NOW.getTime() + WARRANTY_EXPIRING_SOON_DAYS * 86_400_000),
        NOW,
      ),
      "EXPIRING_SOON",
    );
  });

  it("returns EXPIRED after expiry", () => {
    assert.equal(getWarrantyStatus(new Date("2026-09-26T00:00:00Z"), NOW), "EXPIRED");
  });

  it("accepts ISO strings as well as Dates", () => {
    assert.equal(getWarrantyStatus("2027-01-01T00:00:00Z", NOW), "ACTIVE");
  });
});

describe("Asset domain — normalization", () => {
  it("uppercases and slugifies tags", () => {
    assert.equal(normalizeAssetTag("  ast lt 001 "), "AST-LT-001");
  });

  it("collapses name whitespace", () => {
    assert.equal(normalizeAssetName("  MacBook   Pro  "), "MacBook Pro");
  });
});

const validAsset = {
  name: "MacBook Pro 14",
  assetTag: "AST-LT-001",
  description: null,
  categoryId: "cat-1",
  modelId: null,
  brand: "Apple",
  serialNumber: null,
  purchaseDate: "2026-01-15",
  purchaseCost: "185000.00",
  currency: "inr",
  vendorName: null,
  invoiceNumber: null,
  warrantyStartDate: null,
  warrantyEndDate: "2029-01-15",
  condition: "NEW",
  currentLocationId: null,
  currentDepartmentId: null,
};

describe("Asset domain — asset schema", () => {
  it("accepts a valid asset and normalizes tag/currency", () => {
    const parsed = assetSchema.safeParse(validAsset);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.assetTag, "AST-LT-001");
      assert.equal(parsed.data.currency, "INR");
    }
  });

  it("rejects short names, malformed tags and bad money", () => {
    assert.equal(assetSchema.safeParse({ ...validAsset, name: "A" }).success, false);
    assert.equal(assetSchema.safeParse({ ...validAsset, assetTag: "!!" }).success, false);
    assert.equal(assetSchema.safeParse({ ...validAsset, purchaseCost: "12.345" }).success, false);
    assert.equal(assetSchema.safeParse({ ...validAsset, purchaseCost: "-5" }).success, false);
    assert.equal(assetSchema.safeParse({ ...validAsset, purchaseCost: "NaN" }).success, false);
  });

  it("rejects malformed dates and inverted warranty ranges", () => {
    assert.equal(assetSchema.safeParse({ ...validAsset, purchaseDate: "15-01-2026" }).success, false);
    assert.equal(
      assetSchema.safeParse({
        ...validAsset,
        warrantyStartDate: "2029-02-01",
        warrantyEndDate: "2029-01-01",
      }).success,
      false,
    );
  });

  it("rejects unknown conditions", () => {
    assert.equal(assetSchema.safeParse({ ...validAsset, condition: "MINT" }).success, false);
  });
});

describe("Asset domain — taxonomy schemas", () => {
  it("validates categories and detects bad codes", () => {
    assert.equal(
      assetCategorySchema.safeParse({ name: "Laptops", code: "LAPTOP", description: null }).success,
      true,
    );
    assert.equal(assetCategorySchema.safeParse({ name: "L", code: "LAPTOP" }).success, false);
    assert.equal(assetCategorySchema.safeParse({ name: "Laptops", code: "!!" }).success, false);
  });

  it("requires a category for models", () => {
    assert.equal(
      assetModelSchema.safeParse({ categoryId: "", brand: "Apple", modelName: "MBP" }).success,
      false,
    );
    const parsed = assetModelSchema.safeParse({
      categoryId: "cat-1",
      brand: "Apple",
      modelName: "MacBook Pro 14",
      modelCode: "",
      description: null,
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.modelCode, null);
    }
  });
});

describe("Asset domain — assignment schemas", () => {
  const validAssign = {
    assetId: "asset-1",
    membershipId: "mem-1",
    locationId: "loc-1",
    departmentId: null,
    assignedAt: null,
    expectedReturnAt: null,
    condition: "GOOD",
    notes: null,
  };

  it("accepts a minimal assignment", () => {
    assert.equal(assignAssetSchema.safeParse(validAssign).success, true);
  });

  it("requires asset, employee and location", () => {
    assert.equal(assignAssetSchema.safeParse({ ...validAssign, assetId: "" }).success, false);
    assert.equal(assignAssetSchema.safeParse({ ...validAssign, membershipId: "" }).success, false);
    assert.equal(assignAssetSchema.safeParse({ ...validAssign, locationId: "" }).success, false);
  });

  it("rejects an expected return before the assignment date", () => {
    assert.equal(
      assignAssetSchema.safeParse({
        ...validAssign,
        assignedAt: "2026-09-10",
        expectedReturnAt: "2026-09-01",
      }).success,
      false,
    );
  });

  it("requires a return condition", () => {
    assert.equal(
      returnAssetSchema.safeParse({ assetId: "asset-1", notes: null, returnedAt: null }).success,
      false,
    );
    assert.equal(
      returnAssetSchema.safeParse({
        assetId: "asset-1",
        returnCondition: "FAIR",
        notes: null,
        returnedAt: null,
      }).success,
      true,
    );
  });
});
