"use client";

import { useState } from "react";
import { Network, Search, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import Checkbox from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";

export interface AssignableOption {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface AssignmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ids: string[]) => Promise<void>;
  title: string;
  description: string;
  options: AssignableOption[];
  initialSelectedIds: string[];
  isSaving: boolean;
  searchPlaceholder?: string;
  emptyOptionsMessage?: string;
}

export const AssignmentManager = ({
  isOpen,
  onClose,
  onSave,
  title,
  description,
  options,
  initialSelectedIds,
  isSaving,
  searchPlaceholder = "Search by name or code",
  emptyOptionsMessage = "No items available.",
}: AssignmentManagerProps) => {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  if (!isOpen) return null;

  const searchTerm = search.trim().toLowerCase();
  const visibleOptions = options.filter(
    (option) =>
      searchTerm.length === 0 ||
      option.name.toLowerCase().includes(searchTerm) ||
      option.code.toLowerCase().includes(searchTerm),
  );
  const selectedOptions = options.filter((option) => selectedIds.includes(option.id));

  const toggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleSave = async () => {
    await onSave(selectedIds);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assignment-manager-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-card-border bg-card-background shadow-dropdown p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <Network className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <h3 id="assignment-manager-title" className="text-sm font-bold text-foreground">
                {title}
              </h3>
              <p className="text-[11px] text-muted">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-live="polite" aria-label="Selected items">
            {selectedOptions.map((option) => (
              <Badge key={option.id} variant="primary" size="sm">
                {option.name}
                <button
                  type="button"
                  onClick={() => toggle(option.id)}
                  aria-label={`Remove ${option.name} from selection`}
                  className="ml-1 rounded-full hover:text-foreground"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            aria-label="Search items"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        <div
          role="group"
          aria-label={title}
          className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2"
        >
          {visibleOptions.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted">{emptyOptionsMessage}</p>
          ) : (
            visibleOptions.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-elevated"
              >
                <Checkbox
                  checked={selectedIds.includes(option.id)}
                  onCheckedChange={() => toggle(option.id)}
                  disabled={isSaving || !option.isActive}
                  size="sm"
                  aria-label={`${option.name} (${option.code})${option.isActive ? "" : ", inactive"}`}
                />
                <span className="flex flex-1 flex-col">
                  <span className="text-xs font-medium text-foreground">{option.name}</span>
                  <span className="text-[11px] text-muted">{option.code}</span>
                </span>
                {!option.isActive && (
                  <Badge variant="outline" size="sm">
                    Inactive
                  </Badge>
                )}
              </label>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isSaving}
            disabled={isSaving}
            onClick={handleSave}
          >
            Save Assignments
          </Button>
        </div>
      </div>
    </div>
  );
};
