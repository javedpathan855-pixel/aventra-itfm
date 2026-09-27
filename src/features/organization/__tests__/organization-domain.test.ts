import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isValidGstin,
  isValidPan,
  isValidCin,
  maskTaxIdentifier,
} from "../domain/services/tax-validator";
import { calculateProfileCompletion } from "../domain/services/profile-completion";
import {
  updateGeneralProfileSchema,
  updateLegalTaxSchema,
  organizationAddressSchema,
  organizationSettingsSchema,
  logoUploadSchema,
} from "../domain/schemas/organization.schema";
import type { OrganizationProfileEntity } from "../domain/entities/organization-profile";

describe("Organization Domain — Tax Validators", () => {
  it("validates Indian GSTIN formats correctly", () => {
    // Valid standard GSTIN (15 chars)
    assert.equal(isValidGstin("27ABCDE1234F1Z5"), true);
    assert.equal(isValidGstin("29AAAAA0000A1Z5"), true);
    assert.equal(isValidGstin("27abcde1234f1z5"), true); // Case-insensitive in validator

    // Invalid GSTINs
    assert.equal(isValidGstin(""), false);
    assert.equal(isValidGstin("27ABCDE1234F"), false); // Too short
    assert.equal(isValidGstin("27ABCDE1234F1Z599"), false); // Too long
    assert.equal(isValidGstin("XXABCDE1234F1Z5"), false); // Invalid state code digits
  });

  it("validates Indian PAN formats correctly", () => {
    // Valid PAN (10 chars: 5 letters, 4 numbers, 1 letter)
    assert.equal(isValidPan("ABCDE1234F"), true);
    assert.equal(isValidPan("abcde1234f"), true);

    // Invalid PANs
    assert.equal(isValidPan(""), false);
    assert.equal(isValidPan("ABCD12345F"), false);
    assert.equal(isValidPan("12345ABCDE"), false);
    assert.equal(isValidPan("ABCDE12345"), false);
  });

  it("validates Indian CIN formats correctly", () => {
    // Valid CIN (21 chars: U/L + 5 digits + 2 letters state + 4 digits year + 3 letters + 6 digits)
    assert.equal(isValidCin("U12345MH2020PTC123456"), true);
    assert.equal(isValidCin("L99999DL1995PLC012345"), true);

    // Invalid CINs
    assert.equal(isValidCin(""), false);
    assert.equal(isValidCin("X12345MH2020PTC123456"), false); // Must start with U or L
    assert.equal(isValidCin("U12345MH2020PTC"), false); // Too short
  });

  it("masks sensitive tax identifiers cleanly for presentation", () => {
    assert.equal(maskTaxIdentifier(null), "");
    assert.equal(maskTaxIdentifier(undefined), "");
    assert.equal(maskTaxIdentifier("ABC"), "ABC");
    assert.equal(maskTaxIdentifier("ABCDE1234F"), "ABCDE****F");
    assert.equal(maskTaxIdentifier("27ABCDE1234F1Z5"), "27ABCDE****1Z5");
  });
});

describe("Organization Domain — Profile Completion Calculator", () => {
  const minimalProfile: OrganizationProfileEntity = {
    id: "org_1",
    name: "Acme Corp",
    slug: "acme-corp",
    legalName: null,
    businessType: null,
    industry: null,
    description: null,
    website: null,
    contactEmail: null,
    phone: null,
    altPhone: null,
    establishedDate: null,
    logo: null,
    status: "active",
    gstin: null,
    pan: null,
    cin: null,
    businessIdentifier: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    addresses: [],
    settings: null,
  };

  it("calculates baseline score for newly created organization with only name", () => {
    const result = calculateProfileCompletion(minimalProfile);
    assert.equal(result.score, 0);
    assert.equal(result.level, "incomplete");
    assert.equal(result.checklist.find((c) => c.key === "basic_info")?.completed, false);
    assert.equal(result.checklist.find((c) => c.key === "address")?.completed, false);
  });

  it("calculates score when basic info and contact details are filled", () => {
    const profileWithContact: OrganizationProfileEntity = {
      ...minimalProfile,
      legalName: "Acme Corporation Pvt Ltd",
      businessType: "Private Limited",
      description: "Leading enterprise provider",
      contactEmail: "admin@acme.com",
      phone: "+91 9876543210",
    };

    const result = calculateProfileCompletion(profileWithContact);
    // Basic info (25) + Contact info (20) = 45%
    assert.equal(result.score, 45);
    assert.equal(result.level, "in_progress");
  });

  it("reaches complete level when all weighted sections are filled", () => {
    const completeProfile: OrganizationProfileEntity = {
      ...minimalProfile,
      legalName: "Acme Enterprise India Limited",
      businessType: "Public Limited",
      description: "Leading enterprise cloud financial management.",
      contactEmail: "contact@acme.in",
      phone: "+91 9999988888",
      logo: "data:image/png;base64,sample",
      gstin: "27ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      addresses: [
        {
          id: "addr_1",
          organizationId: "org_1",
          type: "registered",
          label: "Headquarters",
          addressLine1: "123 Tech Park",
          addressLine2: null,
          landmark: null,
          city: "Mumbai",
          district: null,
          state: "Maharashtra",
          stateCode: "27",
          country: "India",
          postalCode: "400001",
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    const result = calculateProfileCompletion(completeProfile);
    assert.equal(result.score, 100);
    assert.equal(result.level, "complete");
    assert.equal(result.checklist.every((c) => c.completed), true);
  });
});

describe("Organization Domain — Validation Schemas", () => {
  it("validates updateGeneralProfileSchema inputs", () => {
    const valid = updateGeneralProfileSchema.safeParse({
      name: "Aventra Technologies",
      legalName: "Aventra Technologies Private Limited",
      businessType: "Private Limited",
      contactEmail: "contact@aventra.io",
      phone: "+91 9123456789",
    });
    assert.equal(valid.success, true);

    const invalidName = updateGeneralProfileSchema.safeParse({
      name: "A", // Min 2 chars
    });
    assert.equal(invalidName.success, false);

    const invalidEmail = updateGeneralProfileSchema.safeParse({
      name: "Valid Name",
      contactEmail: "invalid-email-format",
    });
    assert.equal(invalidEmail.success, false);
  });

  it("validates updateLegalTaxSchema inputs", () => {
    const valid = updateLegalTaxSchema.safeParse({
      gstin: "27ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      cin: "U12345MH2020PTC123456",
    });
    assert.equal(valid.success, true);

    const invalidGstin = updateLegalTaxSchema.safeParse({
      gstin: "INVALID_GST",
    });
    assert.equal(invalidGstin.success, false);
  });

  it("validates organizationAddressSchema inputs", () => {
    const valid = organizationAddressSchema.safeParse({
      type: "registered",
      addressLine1: "Plot 42, Cyber City",
      city: "Gurugram",
      state: "Haryana",
      country: "India",
      postalCode: "122002",
      isDefault: true,
    });
    assert.equal(valid.success, true);

    const missingPostal = organizationAddressSchema.safeParse({
      type: "registered",
      addressLine1: "Plot 42, Cyber City",
      city: "Gurugram",
      state: "Haryana",
      country: "India",
      // missing postalCode
    });
    assert.equal(missingPostal.success, false);
  });

  it("validates organizationSettingsSchema inputs", () => {
    const valid = organizationSettingsSchema.safeParse({
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "12h",
      currency: "INR",
    });
    assert.equal(valid.success, true);

    const invalidTz = organizationSettingsSchema.safeParse({
      timezone: "Invalid/Timezone",
      locale: "en-IN",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "12h",
      currency: "INR",
    });
    assert.equal(invalidTz.success, false);
  });

  it("validates logoUploadSchema inputs and rejects unsafe non-image types", () => {
    const validPng = logoUploadSchema.safeParse({
      dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA",
    });
    assert.equal(validPng.success, true);

    const unsafeSvg = logoUploadSchema.safeParse({
      dataUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    });
    assert.equal(unsafeSvg.success, false);

    const executableData = logoUploadSchema.safeParse({
      dataUrl: "data:application/octet-stream;base64,AAAA",
    });
    assert.equal(executableData.success, false);
  });
});
