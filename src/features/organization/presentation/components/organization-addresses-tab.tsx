"use client";

import { useState } from "react";
import { Check, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "@/shared/components/ui/toast";
import { AddressDialog } from "./address-dialog";
import {
  deleteOrganizationAddressAction,
  saveOrganizationAddressAction,
  setDefaultAddressAction,
} from "@/app/organization/actions";
import type {
  OrganizationAddressEntity,
  ProfileCompletionResult,
} from "../../domain/entities/organization-profile";
import { ADDRESS_TYPE_LABELS } from "../../domain/constants/organization-constants";
import type { OrganizationAddressInput } from "../../domain/schemas/organization.schema";

interface OrganizationAddressesTabProps {
  addresses: OrganizationAddressEntity[];
  onAddressesUpdated: (
    addresses: OrganizationAddressEntity[],
    completion?: ProfileCompletionResult,
  ) => void;
}

export const OrganizationAddressesTab = ({
  addresses,
  onAddressesUpdated,
}: OrganizationAddressesTabProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<OrganizationAddressEntity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (address: OrganizationAddressEntity) => {
    setEditingAddress(address);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: OrganizationAddressInput) => {
    setIsSaving(true);
    try {
      const result = await saveOrganizationAddressAction(data);
      if (!result.ok) {
        toast.error("Address Save Failed", { description: result.message });
        return;
      }
      toast.success("Address Saved", {
        description: "Organization address details updated.",
      });
      onAddressesUpdated(result.data.addresses);
      setIsDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!window.confirm("Are you sure you want to remove this address?")) return;
    setDeletingId(addressId);
    try {
      const result = await deleteOrganizationAddressAction(addressId);
      if (!result.ok) {
        toast.error("Delete Failed", { description: result.message });
        return;
      }
      toast.success("Address Removed", {
        description: "The address record has been deleted.",
      });
      onAddressesUpdated(result.data.addresses);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const result = await setDefaultAddressAction(addressId);
      if (!result.ok) {
        toast.error("Action Failed", { description: result.message });
        return;
      }
      toast.success("Default Address Updated", {
        description: "Primary organization address has been updated.",
      });
      onAddressesUpdated(result.data.addresses);
    } catch {
      toast.error("Error setting default address");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Organization Addresses ({addresses.length})
          </h2>
          <p className="text-xs text-muted">
            Manage registered office, corporate branches, and billing locations.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Address</span>
        </Button>
      </div>

      {/* Address Cards List */}
      {addresses.length === 0 ? (
        <Card className="p-8 text-center flex flex-col items-center justify-center gap-3 border-dashed border-border/60">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted border border-border/40 text-muted">
            <MapPin className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="text-sm font-semibold text-foreground">No addresses configured</h3>
            <p className="text-xs text-muted">
              Add your registered office or corporate operational facilities to complete your
              profile and enable tax-compliant invoicing.
            </p>
          </div>
          <Button type="button" variant="primary" size="sm" onClick={handleOpenAdd} className="mt-2">
            Add Registered Office
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className="p-5 flex flex-col justify-between gap-4 border-border/50 hover:border-border-strong transition-colors"
            >
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" size="sm" className="capitalize text-xs font-semibold">
                      {ADDRESS_TYPE_LABELS[address.type] || address.type}
                    </Badge>
                    {address.isDefault && (
                      <Badge variant="success" size="sm" className="gap-1 text-[10px]">
                        <Check className="h-3 w-3" />
                        <span>Default</span>
                      </Badge>
                    )}
                  </div>
                  {address.label && (
                    <span className="text-xs text-muted font-medium truncate">{address.label}</span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5 text-xs text-muted leading-relaxed">
                  <span className="font-semibold text-foreground text-sm">
                    {address.addressLine1}
                  </span>
                  {address.addressLine2 && <span>{address.addressLine2}</span>}
                  {address.landmark && (
                    <span className="italic text-[11px]">Landmark: {address.landmark}</span>
                  )}
                  <span>
                    {address.city}, {address.state} - {address.postalCode}
                  </span>
                  <span>{address.country}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-border/30 pt-3 mt-1">
                {!address.isDefault ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => handleSetDefault(address.id)}
                    className="gap-1 text-xs text-muted hover:text-foreground"
                  >
                    <Star className="h-3 w-3" />
                    <span>Set Default</span>
                  </Button>
                ) : (
                  <span className="text-[11px] text-success font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" /> Primary Location
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => handleOpenEdit(address)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="text-error border-error/30 hover:bg-error/10 hover:border-error/50"
                    disabled={deletingId === address.id}
                    onClick={() => handleDelete(address.id)}
                    aria-label={`Delete address ${address.addressLine1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <AddressDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        initialData={editingAddress}
        isSaving={isSaving}
      />
    </div>
  );
};
