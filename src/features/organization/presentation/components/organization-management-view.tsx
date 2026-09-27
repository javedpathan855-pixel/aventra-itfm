"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Building2,
  FileText,
  ShieldCheck,
  MapPin,
  Sparkles,
  Settings,
  Users,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { ProfileCompletionCard } from "./profile-completion-card";
import { OrganizationOverviewTab } from "./organization-overview-tab";
import { OrganizationGeneralTab } from "./organization-general-tab";
import { OrganizationLegalTab } from "./organization-legal-tab";
import { OrganizationAddressesTab } from "./organization-addresses-tab";
import { OrganizationBrandingTab } from "./organization-branding-tab";
import { OrganizationSettingsTab } from "./organization-settings-tab";
import { OrganizationMembersTab } from "./organization-members-tab";
import { calculateProfileCompletion } from "../../domain/services/profile-completion";
import type {
  OrganizationAddressEntity,
  OrganizationProfileEntity,
  OrganizationSettingsEntity,
  ProfileCompletionResult,
} from "../../domain/entities/organization-profile";

type TabKey =
  | "overview"
  | "general"
  | "legal"
  | "addresses"
  | "branding"
  | "settings"
  | "members";

interface TabItem {
  key: TabKey;
  label: string;
  icon: typeof Building2;
}

const TABS: TabItem[] = [
  { key: "overview", label: "Overview", icon: Building2 },
  { key: "general", label: "General", icon: FileText },
  { key: "legal", label: "Legal & Tax", icon: ShieldCheck },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "branding", label: "Branding", icon: Sparkles },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "members", label: "Members & Roles", icon: Users },
];

interface OrganizationManagementViewProps {
  initialProfile: OrganizationProfileEntity;
  initialCompletion: ProfileCompletionResult;
  userRole: string;
}

export const OrganizationManagementView = ({
  initialProfile,
  initialCompletion,
  userRole,
}: OrganizationManagementViewProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [profile, setProfile] = useState<OrganizationProfileEntity>(initialProfile);
  const [completion, setCompletion] = useState<ProfileCompletionResult>(initialCompletion);

  const canEdit = userRole === "OWNER" || userRole === "ADMIN";

  const handleProfileUpdated = (
    updatedProfile: OrganizationProfileEntity,
    newCompletion: ProfileCompletionResult,
  ) => {
    setProfile(updatedProfile);
    setCompletion(newCompletion);
  };

  const handleAddressesUpdated = (
    addresses: OrganizationAddressEntity[],
    newCompletion?: ProfileCompletionResult,
  ) => {
    const updated = { ...profile, addresses };
    setProfile(updated);
    setCompletion(newCompletion || calculateProfileCompletion(updated));
  };

  const handleSettingsUpdated = (settings: OrganizationSettingsEntity) => {
    setProfile((prev) => ({ ...prev, settings }));
  };

  const handleNavigateTab = (tabKey: string) => {
    const valid = TABS.some((t) => t.key === tabKey);
    if (valid) {
      setActiveTab(tabKey as TabKey);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 rounded-xl border border-border bg-surface-elevated flex items-center justify-center overflow-hidden shadow-xs">
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
                <Building2 className="h-8 w-8 text-primary/80" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {profile.name}
                </h1>
                <Badge variant="primary" size="sm">
                  {userRole}
                </Badge>
                <Badge
                  variant={profile.status === "active" ? "success" : "default"}
                  size="sm"
                >
                  {profile.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted">
                {profile.legalName && <span>Legal: {profile.legalName}</span>}
                <span>Slug: <code className="font-mono text-foreground/80">{profile.slug}</code></span>
                {profile.businessType && <span>Type: {profile.businessType}</span>}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-muted">Organization ID</span>
              <p className="font-mono text-xs text-foreground truncate max-w-[140px]" title={profile.id}>
                {profile.id}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Readiness & Completion Card */}
      <ProfileCompletionCard
        completion={completion}
        onNavigateTab={handleNavigateTab}
      />

      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Organization sections"
        className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border no-scrollbar"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-content-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-md text-xs font-medium transition-colors whitespace-nowrap border-b-2 -mb-[1px] ${
                isActive
                  ? "border-primary text-foreground bg-surface-elevated/40"
                  : "border-transparent text-muted hover:text-foreground hover:bg-surface-elevated/20"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div id={`tab-content-${activeTab}`} role="tabpanel" tabIndex={0} className="focus:outline-none">
        {activeTab === "overview" && (
          <OrganizationOverviewTab
            profile={profile}
            completion={completion}
            role={userRole}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {activeTab === "general" && (
          <OrganizationGeneralTab
            profile={profile}
            onProfileUpdated={handleProfileUpdated}
          />
        )}

        {activeTab === "legal" && (
          <OrganizationLegalTab
            profile={profile}
            onProfileUpdated={handleProfileUpdated}
          />
        )}

        {activeTab === "addresses" && (
          <OrganizationAddressesTab
            addresses={profile.addresses}
            onAddressesUpdated={handleAddressesUpdated}
          />
        )}

        {activeTab === "branding" && (
          <OrganizationBrandingTab
            profile={profile}
            onProfileUpdated={handleProfileUpdated}
            canEdit={canEdit}
          />
        )}

        {activeTab === "settings" && (
          <OrganizationSettingsTab
            profile={profile}
            onSettingsUpdated={handleSettingsUpdated}
            canEdit={canEdit}
          />
        )}

        {activeTab === "members" && (
          <OrganizationMembersTab currentRole={userRole} />
        )}
      </div>
    </div>
  );
};
