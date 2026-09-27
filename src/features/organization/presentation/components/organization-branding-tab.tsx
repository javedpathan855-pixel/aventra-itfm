"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { UploadCloud, Trash2, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { toast } from "@/shared/components/ui/toast";
import {
  MAX_LOGO_SIZE_BYTES,
  ALLOWED_LOGO_MIME_TYPES,
} from "../../domain/constants/organization-constants";
import {
  uploadOrganizationLogoAction,
  removeOrganizationLogoAction,
} from "@/app/organization/actions";
import type {
  OrganizationProfileEntity,
  ProfileCompletionResult,
} from "../../domain/entities/organization-profile";
import {
  orgPageStaggerVariants,
  orgSectionItemVariants,
} from "@/shared/animation";

interface OrganizationBrandingTabProps {
  profile: OrganizationProfileEntity;
  onProfileUpdated: (profile: OrganizationProfileEntity, completion: ProfileCompletionResult) => void;
  canEdit?: boolean;
}

export const OrganizationBrandingTab = ({
  profile,
  onProfileUpdated,
  canEdit = true,
}: OrganizationBrandingTabProps) => {
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLogo = profile.logo || null;

  const validateAndPrepareFile = (file: File) => {
    setErrorMessage(null);

    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type as "image/png" | "image/jpeg" | "image/webp")) {
      const msg = "Invalid file type. Only PNG, JPEG, and WebP images are allowed.";
      setErrorMessage(msg);
      toast.error("Invalid Format", { description: msg });
      return;
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      const msg = "File size exceeds the 2MB limit. Please choose a smaller image.";
      setErrorMessage(msg);
      toast.error("File Too Large", { description: msg });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setSelectedPreview(dataUrl);
      }
    };
    reader.onerror = () => {
      const msg = "Failed to read the selected file.";
      setErrorMessage(msg);
      toast.error("File Read Error", { description: msg });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndPrepareFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canEdit) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndPrepareFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedPreview) return;
    setIsUploading(true);
    setErrorMessage(null);

    const result = await uploadOrganizationLogoAction(selectedPreview);
    setIsUploading(false);

    if (!result.ok) {
      setErrorMessage(result.message);
      toast.error("Upload Failed", { description: result.message });
      return;
    }

    toast.success("Logo Updated", {
      description: "Organization branding logo has been successfully updated.",
    });

    setSelectedPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onProfileUpdated(result.data.profile, result.data.completion);
  };

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to remove the organization logo?")) {
      return;
    }

    setIsRemoving(true);
    setErrorMessage(null);

    const result = await removeOrganizationLogoAction();
    setIsRemoving(false);

    if (!result.ok) {
      setErrorMessage(result.message);
      toast.error("Removal Failed", { description: result.message });
      return;
    }

    toast.success("Logo Removed", {
      description: "Organization logo has been cleared.",
    });

    setSelectedPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onProfileUpdated(result.data.profile, result.data.completion);
  };

  const cancelSelection = () => {
    setSelectedPreview(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayLogo = selectedPreview || currentLogo;

  return (
    <motion.div
      variants={orgPageStaggerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Organization Logo & Branding</h2>
            <p className="text-sm text-muted mt-1">
              Upload your official brand logo. This logo appears in navigation, invoices, and exported reports.
            </p>
          </div>
          {currentLogo && canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={isRemoving || isUploading}
              className="text-error border-error/30 hover:bg-error/10 hover:border-error/50 shrink-0"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {isRemoving ? "Removing..." : "Remove Logo"}
            </Button>
          )}
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-md bg-error/10 border border-error/30 text-error text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Preview area */}
          <motion.div
            variants={orgSectionItemVariants}
            className="lg:col-span-5 flex flex-col items-center justify-center p-8 rounded-lg border border-border bg-surface-elevated/40 text-center"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">
              {selectedPreview ? "New Logo Preview" : currentLogo ? "Active Brand Logo" : "No Logo Uploaded"}
            </span>

            <div className="relative h-32 w-32 rounded-xl border border-border bg-card shadow-card flex items-center justify-center overflow-hidden">
              {displayLogo ? (
                <Image
                  src={displayLogo}
                  alt={`${profile.name} logo`}
                  fill
                  sizes="128px"
                  className="object-contain p-2"
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted">
                  <ImageIcon className="h-10 w-10 stroke-[1.25] text-muted/60 mb-1" />
                  <span className="text-[11px] font-medium">No Logo</span>
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-foreground">{profile.name}</p>
              <p className="text-xs text-muted mt-0.5">{profile.legalName || "No legal name recorded"}</p>
            </div>

            {selectedPreview && (
              <div className="mt-4 flex items-center gap-2 w-full">
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1"
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isUploading ? "animate-spin" : ""}`} />
                  {isUploading ? "Uploading..." : "Save Logo"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelSelection}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </div>
            )}
          </motion.div>

          {/* Right: Upload controls and guidelines */}
          <motion.div
            variants={orgSectionItemVariants}
            className="lg:col-span-7 space-y-6"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={!canEdit || isUploading || isRemoving}
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => canEdit && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center justify-center ${
                canEdit ? "cursor-pointer hover:border-primary/50 hover:bg-surface-elevated/50" : "cursor-not-allowed opacity-60"
              } ${isDragging ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <div className="h-12 w-12 rounded-full bg-surface-elevated border border-border flex items-center justify-center mb-3 text-muted">
                <UploadCloud className="h-6 w-6 text-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Click to browse or drag and drop your logo
              </p>
              <p className="text-xs text-muted mt-1">
                PNG, JPEG, or WebP up to 2MB. Square 1:1 ratio recommended.
              </p>
              {canEdit && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-4 pointer-events-none"
                >
                  Select File
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-elevated/20 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Branding & Safety Guidelines
              </h3>
              <ul className="text-xs text-muted space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>Max file size: <strong>2 Megabytes (MB)</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>Supported formats: <strong>PNG, JPG/JPEG, WebP</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>Executable files, SVGs, scripts, and HTML files are strictly rejected for security.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>For crisp display on high-DPI screens, upload an image of at least <strong>256x256 px</strong>.</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
};
