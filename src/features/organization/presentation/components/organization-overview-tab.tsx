"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Calendar,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import Image from "next/image";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import type {
  OrganizationProfileEntity,
  ProfileCompletionResult,
} from "../../domain/entities/organization-profile";
import { maskTaxIdentifier } from "../../domain/services/tax-validator";
import {
  orgPageStaggerVariants,
  orgSectionItemVariants,
} from "@/shared/animation";

interface OrganizationOverviewTabProps {
  profile: OrganizationProfileEntity;
  completion: ProfileCompletionResult;
  role: string;
  onNavigateTab: (tabKey: string) => void;
}

export const OrganizationOverviewTab = ({
  profile,
  role,
  onNavigateTab,
}: OrganizationOverviewTabProps) => {
  const registeredAddress =
    profile.addresses.find((a) => a.isDefault) ||
    profile.addresses.find((a) => a.type === "registered") ||
    profile.addresses[0];

  const formattedCreated = new Date(profile.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedEstablished = profile.establishedDate
    ? new Date(profile.establishedDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const formattedUpdated = new Date(profile.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      variants={orgPageStaggerVariants}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-6"
    >
      {/* Identity Card */}
      <motion.div variants={orgSectionItemVariants}>
        <Card className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-border/60">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-muted border border-border/60 overflow-hidden shadow-xs">
            {profile.logo ? (
              <Image
                src={profile.logo}
                alt={`${profile.name} logo`}
                fill
                sizes="64px"
                className="object-contain p-1"
                unoptimized
              />
            ) : (
              <Building2 className="h-8 w-8 text-primary/70" aria-hidden="true" />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {profile.name}
              </h1>
              <Badge variant="success" size="sm" className="capitalize">
                {profile.status}
              </Badge>
              <Badge variant="outline" size="sm" className="text-muted border-border/50">
                {profile.businessType || "Company"}
              </Badge>
            </div>

            {profile.legalName && (
              <p className="text-xs text-muted">Legal Name: {profile.legalName}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted flex-wrap pt-0.5">
              <span>Slug: <code className="font-mono text-foreground font-semibold">{profile.slug}</code></span>
              <span>&bull;</span>
              <span suppressHydrationWarning>Joined: {formattedCreated}</span>
              {formattedEstablished && (
                <>
                  <span>&bull;</span>
                  <span suppressHydrationWarning>Est: {formattedEstablished}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onNavigateTab("general")}
          >
            Edit Profile
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab("branding")}
          >
            Update Logo
          </Button>
        </div>
        </Card>
      </motion.div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Contact Information */}
        <motion.div variants={orgSectionItemVariants} className="h-full">
          <Card className="p-4 sm:p-5 flex flex-col gap-3.5 border-border/50 h-full">
          <div className="flex items-center justify-between border-b border-border/30 pb-2.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Contact Channels</span>
            </div>
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={() => onNavigateTab("general")}
              className="text-xs p-0 h-auto"
            >
              Edit
            </Button>
          </div>

          <div className="flex flex-col gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-muted">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-foreground">
                {profile.contactEmail || "No official email provided"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="text-foreground">
                {profile.phone || "No phone number provided"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              {profile.website ? (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-primary hover:underline"
                >
                  {profile.website}
                </a>
              ) : (
                <span>No website provided</span>
              )}
            </div>
          </div>
        </Card>
        </motion.div>

        {/* Legal & Tax Information */}
        <motion.div variants={orgSectionItemVariants} className="h-full">
          <Card className="p-4 sm:p-5 flex flex-col gap-3.5 border-border/50 h-full">
          <div className="flex items-center justify-between border-b border-border/30 pb-2.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Tax & Identification</span>
            </div>
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={() => onNavigateTab("legal")}
              className="text-xs p-0 h-auto"
            >
              Edit
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-surface/50 border border-border/30">
              <span className="text-[10px] text-muted block mb-0.5">GSTIN</span>
              <span className="font-mono text-foreground font-medium truncate block">
                {profile.gstin ? maskTaxIdentifier(profile.gstin) : "Not registered"}
              </span>
            </div>
            <div className="p-2 rounded bg-surface/50 border border-border/30">
              <span className="text-[10px] text-muted block mb-0.5">PAN</span>
              <span className="font-mono text-foreground font-medium truncate block">
                {profile.pan ? maskTaxIdentifier(profile.pan) : "Not provided"}
              </span>
            </div>
            <div className="col-span-2 p-2 rounded bg-surface/50 border border-border/30">
              <span className="text-[10px] text-muted block mb-0.5">CIN</span>
              <span className="font-mono text-foreground font-medium truncate block">
                {profile.cin || "Not incorporated / unlisted"}
              </span>
            </div>
          </div>
        </Card>
        </motion.div>

        {/* Primary Address */}
        <motion.div variants={orgSectionItemVariants} className="h-full md:col-span-2 lg:col-span-1">
          <Card className="p-4 sm:p-5 flex flex-col gap-3.5 border-border/50 h-full">
          <div className="flex items-center justify-between border-b border-border/30 pb-2.5">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Primary Address</span>
            </div>
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={() => onNavigateTab("addresses")}
              className="text-xs p-0 h-auto"
            >
              Manage ({profile.addresses.length})
            </Button>
          </div>

          {registeredAddress ? (
            <div className="flex flex-col gap-1 text-xs text-muted leading-relaxed">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" size="sm" className="capitalize text-[10px]">
                  {registeredAddress.type}
                </Badge>
                {registeredAddress.isDefault && (
                  <span className="text-[10px] text-primary font-medium">Default</span>
                )}
              </div>
              <span className="text-foreground font-medium">
                {registeredAddress.addressLine1}
              </span>
              {registeredAddress.addressLine2 && <span>{registeredAddress.addressLine2}</span>}
              <span>
                {registeredAddress.city}, {registeredAddress.state} - {registeredAddress.postalCode}
              </span>
              <span>{registeredAddress.country}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center text-xs text-muted">
              <span>No addresses saved yet.</span>
              <Button
                type="button"
                variant="link"
                size="xs"
                onClick={() => onNavigateTab("addresses")}
                className="mt-1"
              >
                Add Address
              </Button>
            </div>
          )}
        </Card>
        </motion.div>
      </div>

      {/* Description / Mission */}
      {profile.description && (
        <motion.div variants={orgSectionItemVariants}>
          <Card className="p-5 flex flex-col gap-2 border-border/50">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            About Organization
          </h3>
          <p className="text-xs sm:text-sm text-muted leading-relaxed whitespace-pre-line">
            {profile.description}
          </p>
        </Card>
        </motion.div>
      )}

      {/* Operational Metadata Bar */}
      <motion.div
        variants={orgSectionItemVariants}
        className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-lg border border-border/40 bg-surface/30 text-xs text-muted"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-primary" />
            <span>Role: <strong className="text-foreground font-semibold">{role}</strong></span>
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>Organization ID: <code className="font-mono text-foreground">{profile.id}</code></span>
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span suppressHydrationWarning>Updated: {formattedUpdated}</span>
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onNavigateTab("settings")}
        >
          Regional Settings
        </Button>
      </motion.div>
    </motion.div>
  );
};
