"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Building2,
  Clock,
  FileText,
  Globe,
  Hash,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import Checkbox from "@/shared/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { toast } from "@/shared/components/ui/toast";
import { saveLocationAction } from "@/app/organization/actions";
import {
  locationSchema,
  type LocationFormInput,
  type LocationInput,
} from "../../domain/schemas/location.schema";
import { LOCATION_DESCRIPTION_MAX_LENGTH } from "../../domain/constants/location-constants";
import { orgPageStaggerVariants, orgSectionItemVariants } from "@/shared/animation";

/**
 * Dedicated location creation page content.
 * Mirrors the Add/Edit Location dialog fields, validation and notifications;
 * creation itself flows through the existing `saveLocationAction` use case
 * (no `locationId` → create path) so no business logic is duplicated.
 */
export const LocationCreateView = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LocationFormInput, unknown, LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      email: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      timezone: "",
      isDefault: false,
    },
    mode: "onTouched",
  });

  const descriptionLength = (useWatch({ control: form.control, name: "description" }) ?? "").length;

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const result = await saveLocationAction(values);
      if (!result.ok) {
        toast.error("Failed to create location", { description: result.message });
        return;
      }
      toast.success("Location created", {
        description: `${result.data.location.name} was added successfully.`,
      });
      router.push("/organization/locations");
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleCancel = () => {
    router.push("/organization/locations");
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={orgPageStaggerVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-4"
      >
        <motion.div variants={orgSectionItemVariants} className="self-start">
          <Link
            href="/organization/locations"
            className="inline-flex items-center gap-1.5 self-start text-xs text-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to locations
          </Link>
        </motion.div>

        <motion.div variants={orgSectionItemVariants} className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Add Location
          </h1>
          <p className="text-xs text-muted">Create a new location for your organization</p>
        </motion.div>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <motion.div variants={orgSectionItemVariants}>
              <Card className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary shrink-0">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-sm font-bold text-foreground">Basic Information</h2>
                    <p className="text-xs text-muted">Location name, code and description</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Location Name <span className="text-error" aria-hidden="true">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="e.g. Mumbai HQ"
                            disabled={isSubmitting}
                            value={field.value || ""}
                            onChange={field.onChange}
                            startIcon={<User className="h-4 w-4" aria-hidden="true" />}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Location Code <span className="text-error" aria-hidden="true">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="e.g. MUM-HQ"
                            disabled={isSubmitting}
                            value={field.value || ""}
                            onChange={field.onChange}
                            startIcon={<Hash className="h-4 w-4" aria-hidden="true" />}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Description (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Short description of this location"
                          disabled={isSubmitting}
                          value={field.value || ""}
                          onChange={field.onChange}
                          maxLength={LOCATION_DESCRIPTION_MAX_LENGTH}
                          startIcon={<FileText className="h-4 w-4" aria-hidden="true" />}
                        />
                      </FormControl>
                      <div className="mt-1 flex justify-end">
                        <span className="text-[10px] text-muted" aria-live="off">
                          {descriptionLength}/{LOCATION_DESCRIPTION_MAX_LENGTH}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Card>
            </motion.div>

            <motion.div variants={orgSectionItemVariants}>
              <Card className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary shrink-0">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-sm font-bold text-foreground">Contact Information</h2>
                    <p className="text-xs text-muted">Primary contact details for this location</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Email (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="hq@company.com"
                            disabled={isSubmitting}
                            value={field.value || ""}
                            onChange={field.onChange}
                            startIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
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
                        <FormLabel className="text-xs">Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+91 22 0000 0000"
                            disabled={isSubmitting}
                            value={field.value || ""}
                            onChange={field.onChange}
                            startIcon={<Phone className="h-4 w-4" aria-hidden="true" />}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
            </motion.div>

            <motion.div variants={orgSectionItemVariants}>
              <Card className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary shrink-0">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-sm font-bold text-foreground">Address Details</h2>
                    <p className="text-xs text-muted">Physical address and timezone</p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Address Line 1 (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Street address"
                          disabled={isSubmitting}
                          value={field.value || ""}
                          onChange={field.onChange}
                          startIcon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Address Line 2 (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Floor, suite, landmark"
                          disabled={isSubmitting}
                          value={field.value || ""}
                          onChange={field.onChange}
                          startIcon={<Building2 className="h-4 w-4" aria-hidden="true" />}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">City (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Mumbai"
                            disabled={isSubmitting}
                            value={field.value || ""}
                            onChange={field.onChange}
                            startIcon={<Building2 className="h-4 w-4" aria-hidden="true" />}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">State (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Maharashtra"
                            disabled={isSubmitting}
                            value={field.value || ""}
                            onChange={field.onChange}
                            startIcon={<Building2 className="h-4 w-4" aria-hidden="true" />}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Postal Code (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="400001"
                            disabled={isSubmitting}
                            value={field.value || ""}
                            onChange={field.onChange}
                            startIcon={<Hash className="h-4 w-4" aria-hidden="true" />}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Country (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="India"
                            disabled={isSubmitting}
                            value={field.value || ""}
                            onChange={field.onChange}
                            startIcon={<Globe className="h-4 w-4" aria-hidden="true" />}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Timezone (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Asia/Kolkata"
                            disabled={isSubmitting}
                            value={field.value || ""}
                            onChange={field.onChange}
                            startIcon={<Clock className="h-4 w-4" aria-hidden="true" />}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                          size="sm"
                          label="Set as default location"
                          description="Mark this location as the organization's default."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Card>
            </motion.div>

            <motion.div
              variants={orgSectionItemVariants}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="w-full gap-1.5 sm:w-auto"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {isSubmitting ? "Creating..." : "Create Location"}
              </Button>
            </motion.div>
          </form>
        </Form>
      </motion.div>
    </MotionConfig>
  );
};
