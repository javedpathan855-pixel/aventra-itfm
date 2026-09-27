"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Calendar, Globe, Mail, Phone } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
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
  updateGeneralProfileSchema,
  type UpdateGeneralProfileInput,
  type UpdateGeneralProfileFormInput,
} from "../../domain/schemas/organization.schema";
import { ORGANIZATION_TYPES } from "../../domain/constants/organization-constants";
import { updateOrganizationGeneralAction } from "@/app/organization/actions";
import type {
  OrganizationProfileEntity,
  ProfileCompletionResult,
} from "../../domain/entities/organization-profile";

interface OrganizationGeneralTabProps {
  profile: OrganizationProfileEntity;
  onProfileUpdated: (profile: OrganizationProfileEntity, completion: ProfileCompletionResult) => void;
}

export const OrganizationGeneralTab = ({
  profile,
  onProfileUpdated,
}: OrganizationGeneralTabProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialEstablished = profile.establishedDate
    ? new Date(profile.establishedDate).toISOString().split("T")[0]
    : "";

  const form = useForm<UpdateGeneralProfileFormInput, unknown, UpdateGeneralProfileInput>({
    resolver: zodResolver(updateGeneralProfileSchema),
    defaultValues: {
      name: profile.name || "",
      legalName: profile.legalName || "",
      businessType: profile.businessType || "",
      industry: profile.industry || "",
      description: profile.description || "",
      website: profile.website || "",
      contactEmail: profile.contactEmail || "",
      phone: profile.phone || "",
      altPhone: profile.altPhone || "",
      establishedDate: initialEstablished,
    },
    mode: "onTouched",
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);

    const result = await updateOrganizationGeneralAction(values);

    if (!result.ok) {
      setErrorMessage(result.message);
      toast.error("Update Failed", { description: result.message });
      return;
    }

    toast.success("Profile Updated", {
      description: "General organization details have been safely saved.",
    });

    onProfileUpdated(result.data.profile, result.data.completion);
  });

  return (
    <Card className="p-5 sm:p-7 border-border/60">
      <div className="flex flex-col gap-1 border-b border-border/40 pb-4 mb-6">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
          General Organization Information
        </h2>
        <p className="text-xs text-muted">
          Update primary business credentials, classification, and contact channels.
        </p>
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
          {/* Row 1: Name and Legal Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Organization Name <span className="text-error">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Acme Global Inc."
                      startIcon={<Building2 className="h-4 w-4" />}
                      disabled={form.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="legalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Registered Legal Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Acme Global Solutions Pvt. Ltd."
                      disabled={form.formState.isSubmitting}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Row 2: Type and Industry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="businessType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Organization Type</FormLabel>
                  <FormControl>
                    <Select
                      options={[
                        { value: "", label: "Select organization structure..." },
                        ...ORGANIZATION_TYPES.map((type) => ({ value: type, label: type })),
                      ]}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Industry Domain</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Information Technology, Healthcare, etc."
                      disabled={form.formState.isSubmitting}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Row 3: Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">About & Mission Statement</FormLabel>
                <FormControl>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the organization's enterprise operations..."
                    className="w-full p-3 rounded-md border border-border bg-input-background text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25 disabled:opacity-50"
                    disabled={form.formState.isSubmitting}
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Row 4: Contact Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Official Contact Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="info@acme.com"
                      startIcon={<Mail className="h-4 w-4" />}
                      disabled={form.formState.isSubmitting}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Primary Telephone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+91 22 1234 5678"
                      startIcon={<Phone className="h-4 w-4" />}
                      disabled={form.formState.isSubmitting}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Row 5: Website & Established Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Corporate Website</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://acme.com"
                      startIcon={<Globe className="h-4 w-4" />}
                      disabled={form.formState.isSubmitting}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="establishedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Incorporation / Established Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      startIcon={<Calendar className="h-4 w-4" />}
                      disabled={form.formState.isSubmitting}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
              onClick={() => form.reset()}
            >
              Reset Changes
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};
