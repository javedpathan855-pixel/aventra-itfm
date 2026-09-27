"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, FileText, Info, ShieldCheck } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { toast } from "@/shared/components/ui/toast";
import {
  updateLegalTaxSchema,
  type UpdateLegalTaxInput,
  type UpdateLegalTaxFormInput,
} from "../../domain/schemas/organization.schema";
import { updateOrganizationLegalAction } from "@/app/organization/actions";
import type {
  OrganizationProfileEntity,
  ProfileCompletionResult,
} from "../../domain/entities/organization-profile";
import { isValidCin, isValidGstin, isValidPan, maskTaxIdentifier } from "../../domain/services/tax-validator";

interface OrganizationLegalTabProps {
  profile: OrganizationProfileEntity;
  onProfileUpdated: (profile: OrganizationProfileEntity, completion: ProfileCompletionResult) => void;
}

export const OrganizationLegalTab = ({
  profile,
  onProfileUpdated,
}: OrganizationLegalTabProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMasked, setShowMasked] = useState(true);

  const form = useForm<UpdateLegalTaxFormInput, unknown, UpdateLegalTaxInput>({
    resolver: zodResolver(updateLegalTaxSchema),
    defaultValues: {
      gstin: profile.gstin || "",
      pan: profile.pan || "",
      cin: profile.cin || "",
      businessIdentifier: profile.businessIdentifier || "",
    },
    mode: "onTouched",
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);

    const result = await updateOrganizationLegalAction(values);

    if (!result.ok) {
      setErrorMessage(result.message);
      toast.error("Update Failed", { description: result.message });
      return;
    }

    toast.success("Legal & Tax Details Saved", {
      description: "Business identification records updated successfully.",
    });

    onProfileUpdated(result.data.profile, result.data.completion);
  });

  return (
    <Card className="p-5 sm:p-7 border-border/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4 mb-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Legal & Tax Identification
          </h2>
          <p className="text-xs text-muted">
            Indian statutory compliance numbers (GSTIN, PAN, CIN) for billing and reporting.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setShowMasked((prev) => !prev)}
          className="gap-1.5 self-start sm:self-auto"
        >
          {showMasked ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span>{showMasked ? "Reveal Full Numbers" : "Mask Identifiers"}</span>
        </Button>
      </div>

      {/* Compliance Notice */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted border border-border/40 text-xs text-muted mb-6">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>
          Statutory identifiers are stored securely and used only for business invoices and tax
          compliance reports. They are never published publicly.
        </span>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-3 rounded-lg bg-error-muted border border-error/30 text-xs text-error"
        >
          {errorMessage}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          {/* GSTIN Field */}
          <FormField
            control={form.control}
            name="gstin"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs">Goods & Services Tax Identification Number (GSTIN)</FormLabel>
                  {field.value && (
                    <Badge
                      variant={isValidGstin(field.value) ? "success" : "error"}
                      size="sm"
                    >
                      {isValidGstin(field.value) ? "Valid Format" : "Invalid Format"}
                    </Badge>
                  )}
                </div>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="27AAAAA0000A1Z5"
                    className="font-mono uppercase tracking-wider"
                    startIcon={<ShieldCheck className="h-4 w-4" />}
                    disabled={form.formState.isSubmitting}
                    value={
                      showMasked && field.value && !form.formState.isDirty
                        ? maskTaxIdentifier(field.value)
                        : field.value || ""
                    }
                    onFocus={() => setShowMasked(false)}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <span className="text-[11px] text-muted">
                  15-digit alphanumeric identifier assigned under the GST regime.
                </span>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* PAN Field */}
          <FormField
            control={form.control}
            name="pan"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs">Permanent Account Number (PAN)</FormLabel>
                  {field.value && (
                    <Badge
                      variant={isValidPan(field.value) ? "success" : "error"}
                      size="sm"
                    >
                      {isValidPan(field.value) ? "Valid Format" : "Invalid Format"}
                    </Badge>
                  )}
                </div>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="ABCDE1234F"
                    className="font-mono uppercase tracking-wider"
                    startIcon={<FileText className="h-4 w-4" />}
                    disabled={form.formState.isSubmitting}
                    value={
                      showMasked && field.value && !form.formState.isDirty
                        ? maskTaxIdentifier(field.value)
                        : field.value || ""
                    }
                    onFocus={() => setShowMasked(false)}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <span className="text-[11px] text-muted">
                  10-digit entity PAN issued by the Income Tax Department of India.
                </span>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CIN Field */}
          <FormField
            control={form.control}
            name="cin"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs">Corporate Identification Number (CIN)</FormLabel>
                  {field.value && (
                    <Badge
                      variant={isValidCin(field.value) ? "success" : "error"}
                      size="sm"
                    >
                      {isValidCin(field.value) ? "Valid Format" : "Invalid Format"}
                    </Badge>
                  )}
                </div>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="U12345MH2020PTC123456"
                    className="font-mono uppercase tracking-wider"
                    disabled={form.formState.isSubmitting}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <span className="text-[11px] text-muted">
                  21-digit unique identification assigned by the Registrar of Companies (ROC).
                </span>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Additional Business Identifier */}
          <FormField
            control={form.control}
            name="businessIdentifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Other Business Registration / MSME / Udyam Number</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="UDYAM-MH-01-0000000"
                    disabled={form.formState.isSubmitting}
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
              onClick={() => form.reset()}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Saving..." : "Save Legal Details"}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};
