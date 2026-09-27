"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe2, Clock, Calendar, DollarSign, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
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
  organizationSettingsSchema,
  type OrganizationSettingsInput,
  type OrganizationSettingsFormInput,
} from "../../domain/schemas/organization.schema";
import {
  SUPPORTED_TIMEZONES,
  SUPPORTED_DATE_FORMATS,
  SUPPORTED_TIME_FORMATS,
  SUPPORTED_CURRENCIES,
} from "../../domain/constants/organization-constants";
import { updateOrganizationSettingsAction } from "@/app/organization/actions";
import type {
  OrganizationProfileEntity,
  OrganizationSettingsEntity,
} from "../../domain/entities/organization-profile";

interface OrganizationSettingsTabProps {
  profile: OrganizationProfileEntity;
  onSettingsUpdated: (settings: OrganizationSettingsEntity) => void;
  canEdit?: boolean;
}

export const OrganizationSettingsTab = ({
  profile,
  onSettingsUpdated,
  canEdit = true,
}: OrganizationSettingsTabProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultSettings = profile.settings || {
    displayName: profile.name,
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    dateFormat: "DD/MM/YYYY" as const,
    timeFormat: "12h" as const,
    currency: "INR" as const,
  };

  const defaultDateFormat = (
    SUPPORTED_DATE_FORMATS as readonly string[]
  ).includes(defaultSettings.dateFormat)
    ? (defaultSettings.dateFormat as "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD")
    : "DD/MM/YYYY";

  const defaultTimeFormat = (
    SUPPORTED_TIME_FORMATS as readonly string[]
  ).includes(defaultSettings.timeFormat)
    ? (defaultSettings.timeFormat as "12h" | "24h")
    : "12h";

  const defaultCurrency = (
    SUPPORTED_CURRENCIES as readonly string[]
  ).includes(defaultSettings.currency)
    ? (defaultSettings.currency as "INR" | "USD" | "EUR" | "GBP" | "AED" | "SGD")
    : "INR";

  const form = useForm<OrganizationSettingsFormInput, unknown, OrganizationSettingsInput>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      displayName: defaultSettings.displayName || profile.name,
      timezone: defaultSettings.timezone || "Asia/Kolkata",
      locale: defaultSettings.locale || "en-IN",
      dateFormat: defaultDateFormat,
      timeFormat: defaultTimeFormat,
      currency: defaultCurrency,
    },
    mode: "onTouched",
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);

    const result = await updateOrganizationSettingsAction(values);

    if (!result.ok) {
      setErrorMessage(result.message);
      toast.error("Settings Update Failed", { description: result.message });
      return;
    }

    toast.success("Settings Saved", {
      description: "Organization regional preferences and formats have been updated.",
    });

    onSettingsUpdated(result.data.settings);
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Regional & System Preferences</h2>
            <p className="text-sm text-muted mt-1">
              Configure default currency, timezone, date formatting, and regional localization.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded bg-surface-elevated border border-border text-foreground font-mono">
              Status: {profile.status.toUpperCase()}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-md bg-error/10 border border-error/30 text-error text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Display Name */}
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={profile.name}
                        disabled={!canEdit || form.formState.isSubmitting}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-[11px] text-muted">
                      Optional compact name used in header badges and mobile views.
                    </p>
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Operating Currency</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                        <select
                          className="h-10 w-full rounded-md border border-input-border bg-input-background pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                          disabled={!canEdit || form.formState.isSubmitting}
                          {...field}
                        >
                          {SUPPORTED_CURRENCIES.map((cur) => (
                            <option key={cur} value={cur}>
                              {cur} {cur === "INR" ? "(Indian Rupee - ₹)" : cur === "USD" ? "(US Dollar - $)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-[11px] text-muted">
                      Default currency used for billing reports, financial analytics, and ITFM forecasts.
                    </p>
                  </FormItem>
                )}
              />

              {/* Timezone */}
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Timezone</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                        <select
                          className="h-10 w-full rounded-md border border-input-border bg-input-background pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                          disabled={!canEdit || form.formState.isSubmitting}
                          {...field}
                        >
                          {SUPPORTED_TIMEZONES.map((tz) => (
                            <option key={tz} value={tz}>
                              {tz}
                            </option>
                          ))}
                        </select>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-[11px] text-muted">
                      Timezone applied to system schedules, SLA triggers, and invoice due dates.
                    </p>
                  </FormItem>
                )}
              />

              {/* Locale */}
              <FormField
                control={form.control}
                name="locale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Locale / Number Formatting</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="en-IN"
                        disabled={!canEdit || form.formState.isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-[11px] text-muted">
                      BCP 47 language tag (e.g. <code>en-IN</code> for Indian Lakhs/Crores numbering, <code>en-US</code> for millions).
                    </p>
                  </FormItem>
                )}
              />

              {/* Date Format */}
              <FormField
                control={form.control}
                name="dateFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Display Format</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                        <select
                          className="h-10 w-full rounded-md border border-input-border bg-input-background pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                          disabled={!canEdit || form.formState.isSubmitting}
                          {...field}
                        >
                          {SUPPORTED_DATE_FORMATS.map((fmt) => (
                            <option key={fmt} value={fmt}>
                              {fmt} {fmt === "DD/MM/YYYY" ? "(Standard India / UK)" : fmt === "MM/DD/YYYY" ? "(US Standard)" : "(ISO 8601)"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time Format */}
              <FormField
                control={form.control}
                name="timeFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Display Format</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                        <select
                          className="h-10 w-full rounded-md border border-input-border bg-input-background pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                          disabled={!canEdit || form.formState.isSubmitting}
                          {...field}
                        >
                          {SUPPORTED_TIME_FORMATS.map((tf) => (
                            <option key={tf} value={tf}>
                              {tf === "12h" ? "12-hour (e.g. 02:30 PM)" : "24-hour (e.g. 14:30)"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {canEdit && (
              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={!form.formState.isDirty || form.formState.isSubmitting}
                >
                  Discard Changes
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!form.formState.isDirty || form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Saving Preferences..." : "Save Preferences"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </Card>

      {/* Security & Organization Lifecycle Card */}
      <Card className="p-6 border-border/80">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center shrink-0 text-muted">
            <ShieldAlert className="h-5 w-5 text-warning" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Organization Lifecycle & Data Retention</h3>
            <p className="text-xs text-muted leading-relaxed">
              Organization records, invoices, allocation rules, and historical audit entries are protected under strict tenant isolation policies. Organizations cannot be deleted while dependent financial records or billing cycles exist.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-elevated border border-border">
                <CheckCircle2 className="h-3 w-3 text-success" />
                Soft-archival policy enabled
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-elevated border border-border">
                <CheckCircle2 className="h-3 w-3 text-success" />
                Sole Owner demotion prevention active
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
