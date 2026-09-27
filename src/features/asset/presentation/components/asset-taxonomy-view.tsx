"use client";

import { useRef, useState, useTransition } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Cpu, MoreHorizontal, Plus, RotateCcw, Search, Tags } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/shared/components/ui/dropdown";
import { toast } from "@/shared/components/ui/toast";
import {
  listCategoriesAction,
  listModelsAction,
  saveCategoryAction,
  saveModelAction,
  setCategoryActiveAction,
  setModelActiveAction,
} from "@/app/assets/actions";
import type {
  AssetCategoryInput,
  AssetModelInput,
} from "../../domain/schemas/asset.schema";
import type {
  CategoryWithAssetCount,
  ModelWithAssetCount,
  PaginatedResult,
} from "../../domain/entities/asset";
import { fadeInVariants } from "@/shared/animation";
import { CategoryDialog } from "./asset-category-dialog";
import { ModelDialog } from "./asset-model-dialog";

interface AssetTaxonomyViewProps {
  initialCategories: PaginatedResult<CategoryWithAssetCount>;
  initialModels: PaginatedResult<ModelWithAssetCount>;
  userRole: string;
}

type TabKey = "categories" | "models";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

interface RowMenuProps {
  name: string;
  isActive: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
}

const RowMenu = ({ name, isActive, onEdit, onToggleActive }: RowMenuProps) => (
  <Dropdown>
    <DropdownTrigger
      aria-label={`Actions for ${name}`}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors outline-none hover:bg-surface-elevated hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
    </DropdownTrigger>
    <DropdownContent align="right" className="min-w-44">
      <DropdownItem onClick={onEdit}>Edit</DropdownItem>
      <DropdownItem variant={isActive ? "danger" : "default"} onClick={onToggleActive}>
        {isActive ? "Deactivate" : "Reactivate"}
      </DropdownItem>
    </DropdownContent>
  </Dropdown>
);

export const AssetTaxonomyView = ({
  initialCategories,
  initialModels,
  userRole,
}: AssetTaxonomyViewProps) => {
  const canManage = userRole === "OWNER" || userRole === "ADMIN";
  const [activeTab, setActiveTab] = useState<TabKey>("categories");
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  const [categoryData, setCategoryData] = useState(initialCategories);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryStatus, setCategoryStatus] = useState<string>("all");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithAssetCount | null>(null);

  const [modelData, setModelData] = useState(initialModels);
  const [modelSearch, setModelSearch] = useState("");
  const [modelStatus, setModelStatus] = useState<string>("all");
  const [modelCategoryFilter, setModelCategoryFilter] = useState<string>("");
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelWithAssetCount | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFetch = (run: () => void) => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    searchTimer.current = setTimeout(run, 350);
  };

  const fetchCategories = (overrides: Partial<{ q: string; status: string; page: number }> = {}) => {
    startTransition(async () => {
      const result = await listCategoriesAction({
        search: overrides.q ?? categorySearch,
        status: overrides.status ?? categoryStatus,
        page: overrides.page ?? 1,
        pageSize: categoryData.pageSize,
      });
      if (!result.ok) {
        toast.error("Failed to load categories", { description: result.message });
        return;
      }
      setCategoryData(result.data);
    });
  };

  const fetchModels = (
    overrides: Partial<{ q: string; status: string; categoryId: string; page: number }> = {},
  ) => {
    startTransition(async () => {
      const result = await listModelsAction({
        search: overrides.q ?? modelSearch,
        status: overrides.status ?? modelStatus,
        categoryId: overrides.categoryId ?? modelCategoryFilter,
        page: overrides.page ?? 1,
        pageSize: modelData.pageSize,
      });
      if (!result.ok) {
        toast.error("Failed to load models", { description: result.message });
        return;
      }
      setModelData(result.data);
    });
  };

  const handleSaveCategory = async (values: AssetCategoryInput) => {
    setIsSaving(true);
    try {
      const payload = editingCategory ? { ...values, categoryId: editingCategory.id } : values;
      const result = await saveCategoryAction(payload);
      if (!result.ok) {
        toast.error(editingCategory ? "Failed to save category" : "Failed to create category", {
          description: result.message,
        });
        return;
      }
      toast.success(editingCategory ? "Category updated" : "Category created", {
        description: `${result.data.category.name} was saved successfully.`,
      });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      fetchCategories({ page: editingCategory ? categoryData.page : 1 });
      if (activeTab === "models") fetchModels();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveModel = async (values: AssetModelInput) => {
    setIsSaving(true);
    try {
      const payload = editingModel ? { ...values, modelId: editingModel.id } : values;
      const result = await saveModelAction(payload);
      if (!result.ok) {
        toast.error(editingModel ? "Failed to save model" : "Failed to create model", {
          description: result.message,
        });
        return;
      }
      toast.success(editingModel ? "Model updated" : "Model created", {
        description: `${result.data.model.brand} ${result.data.model.modelName} was saved successfully.`,
      });
      setModelDialogOpen(false);
      setEditingModel(null);
      fetchModels({ page: editingModel ? modelData.page : 1 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCategory = (category: CategoryWithAssetCount) => {
    const nextActive = !category.isActive;
    if (!nextActive && category.assetCount > 0) {
      toast.error("Cannot deactivate category", {
        description: `${category.assetCount} active assets still reference this category.`,
      });
      return;
    }
    if (!window.confirm(`${nextActive ? "Reactivate" : "Deactivate"} category "${category.name}"?\n\nContinue?`)) {
      return;
    }
    startTransition(async () => {
      const result = await setCategoryActiveAction({ categoryId: category.id, isActive: nextActive });
      if (!result.ok) {
        toast.error("Failed to update category", { description: result.message });
        return;
      }
      toast.success(nextActive ? "Category reactivated" : "Category deactivated");
      fetchCategories({ page: categoryData.page });
    });
  };

  const handleToggleModel = (model: ModelWithAssetCount) => {
    const nextActive = !model.isActive;
    if (!nextActive && model.assetCount > 0) {
      toast.error("Cannot deactivate model", {
        description: `${model.assetCount} active assets still reference this model.`,
      });
      return;
    }
    if (!window.confirm(`${nextActive ? "Reactivate" : "Deactivate"} model "${model.brand} ${model.modelName}"?\n\nContinue?`)) {
      return;
    }
    startTransition(async () => {
      const result = await setModelActiveAction({ modelId: model.id, isActive: nextActive });
      if (!result.ok) {
        toast.error("Failed to update model", { description: result.message });
        return;
      }
      toast.success(nextActive ? "Model reactivated" : "Model deactivated");
      fetchModels({ page: modelData.page });
    });
  };

  const openCategoryDialog = (category: CategoryWithAssetCount | null) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const openModelDialog = (model: ModelWithAssetCount | null) => {
    setEditingModel(model);
    setModelDialogOpen(true);
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={fadeInVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Categories & Models
            </h1>
            <p className="text-xs text-muted">Organize your asset taxonomy</p>
          </div>
          {canManage && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() =>
                activeTab === "categories" ? openCategoryDialog(null) : openModelDialog(null)
              }
              className="gap-1.5 self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {activeTab === "categories" ? "Add Category" : "Add Model"}
            </Button>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Asset taxonomy"
          className="flex items-center gap-1 border-b border-border"
        >
          {(["categories", "models"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-[1px] transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-primary text-foreground bg-surface-elevated/40"
                  : "border-transparent text-muted hover:text-foreground hover:bg-surface-elevated/20"
              }`}
            >
              {tab === "categories" ? "Categories" : "Models"}
            </button>
          ))}
        </div>

        {activeTab === "categories" ? (
          <div className="flex flex-col gap-4" role="tabpanel" aria-label="Categories">
            <Card className="p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchCategories({ page: 1 });
                }}
                className="flex flex-col gap-3 lg:flex-row lg:items-end"
                role="search"
                aria-label="Search and filter categories"
              >
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <Input
                    type="text"
                    placeholder="Search by name or code"
                    aria-label="Search categories by name or code"
                    value={categorySearch}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      debouncedFetch(() => fetchCategories({ q: e.target.value, page: 1 }));
                    }}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                    <span className="text-[11px] font-medium text-muted">Status</span>
                    <Select
                      aria-label="Filter categories by status"
                      size="md"
                      wrapperClassName="w-full sm:w-auto sm:min-w-36"
                      options={STATUS_OPTIONS.map((o) => ({ ...o }))}
                      value={categoryStatus}
                      onChange={(next) => {
                        setCategoryStatus(next);
                        fetchCategories({ status: next, page: 1 });
                      }}
                      disabled={isPending}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={isPending}
                    onClick={() => {
                      if (searchTimer.current) {
                        clearTimeout(searchTimer.current);
                      }
                      setCategorySearch("");
                      setCategoryStatus("all");
                      fetchCategories({ q: "", status: "all", page: 1 });
                    }}
                    className="gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Reset
                  </Button>
                </div>
              </form>
            </Card>

            {categoryData.items.length === 0 ? (
              <Card className="flex flex-col items-center gap-2 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated/60 text-muted">
                  <Tags className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-foreground">No categories found</p>
                <p className="max-w-sm text-xs text-muted">
                  {categorySearch || categoryStatus !== "all"
                    ? "Try adjusting your search or filters."
                    : "Create your first asset category to organize inventory."}
                </p>
              </Card>
            ) : (
              <ul className="flex flex-col gap-3" aria-label="Categories">
                {categoryData.items.map((category) => (
                  <li key={category.id}>
                    <Card className="flex items-center gap-4 p-4 transition-colors hover:border-border-strong">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated/60 text-primary"
                        aria-hidden="true"
                      >
                        <Tags className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {category.name}
                          </span>
                          <Badge variant={category.isActive ? "success" : "outline"} size="sm">
                            {category.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted">
                          {category.code} · {category.assetCount}{" "}
                          {category.assetCount === 1 ? "asset" : "assets"} · {category.modelCount}{" "}
                          {category.modelCount === 1 ? "model" : "models"}
                        </p>
                      </div>
                      {canManage && (
                        <RowMenu
                          name={category.name}
                          isActive={category.isActive}
                          onEdit={() => openCategoryDialog(category)}
                          onToggleActive={() => handleToggleCategory(category)}
                        />
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}

            {canManage && (
              <CategoryDialog
                key={editingCategory ? `edit-${editingCategory.id}` : "new-category"}
                isOpen={categoryDialogOpen}
                onClose={() => {
                  setCategoryDialogOpen(false);
                  setEditingCategory(null);
                }}
                onSave={handleSaveCategory}
                initialData={editingCategory}
                isSaving={isSaving}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4" role="tabpanel" aria-label="Models">
            <Card className="p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchModels({ page: 1 });
                }}
                className="flex flex-col gap-3 lg:flex-row lg:items-end"
                role="search"
                aria-label="Search and filter models"
              >
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <Input
                    type="text"
                    placeholder="Search by brand, name or code"
                    aria-label="Search models by brand, name or code"
                    value={modelSearch}
                    onChange={(e) => {
                      setModelSearch(e.target.value);
                      debouncedFetch(() => fetchModels({ q: e.target.value, page: 1 }));
                    }}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                    <span className="text-[11px] font-medium text-muted">Category</span>
                    <Select
                      aria-label="Filter models by category"
                      size="md"
                      wrapperClassName="w-full sm:w-auto sm:min-w-36"
                      options={[
                        { value: "", label: "All categories" },
                        ...categoryData.items.map((c) => ({ value: c.id, label: c.name })),
                      ]}
                      value={modelCategoryFilter}
                      onChange={(next) => {
                        setModelCategoryFilter(next);
                        fetchModels({ categoryId: next, page: 1 });
                      }}
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                    <span className="text-[11px] font-medium text-muted">Status</span>
                    <Select
                      aria-label="Filter models by status"
                      size="md"
                      wrapperClassName="w-full sm:w-auto sm:min-w-36"
                      options={STATUS_OPTIONS.map((o) => ({ ...o }))}
                      value={modelStatus}
                      onChange={(next) => {
                        setModelStatus(next);
                        fetchModels({ status: next, page: 1 });
                      }}
                      disabled={isPending}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={isPending}
                    onClick={() => {
                      if (searchTimer.current) {
                        clearTimeout(searchTimer.current);
                      }
                      setModelSearch("");
                      setModelStatus("all");
                      setModelCategoryFilter("");
                      fetchModels({ q: "", status: "all", categoryId: "", page: 1 });
                    }}
                    className="gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Reset
                  </Button>
                </div>
              </form>
            </Card>

            {modelData.items.length === 0 ? (
              <Card className="flex flex-col items-center gap-2 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated/60 text-muted">
                  <Cpu className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-foreground">No models found</p>
                <p className="max-w-sm text-xs text-muted">
                  {modelSearch || modelStatus !== "all" || modelCategoryFilter !== ""
                    ? "Try adjusting your search or filters."
                    : "Add your first asset model to standardize procurement."}
                </p>
              </Card>
            ) : (
              <ul className="flex flex-col gap-3" aria-label="Models">
                {modelData.items.map((model) => (
                  <li key={model.id}>
                    <Card className="flex items-center gap-4 p-4 transition-colors hover:border-border-strong">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated/60 text-primary"
                        aria-hidden="true"
                      >
                        <Cpu className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {model.brand} {model.modelName}
                          </span>
                          <Badge variant={model.isActive ? "success" : "outline"} size="sm">
                            {model.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted">
                          {model.categoryName}
                          {model.modelCode ? ` · ${model.modelCode}` : ""} · {model.assetCount}{" "}
                          {model.assetCount === 1 ? "asset" : "assets"}
                        </p>
                      </div>
                      {canManage && (
                        <RowMenu
                          name={`${model.brand} ${model.modelName}`}
                          isActive={model.isActive}
                          onEdit={() => openModelDialog(model)}
                          onToggleActive={() => handleToggleModel(model)}
                        />
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}

            {canManage && (
              <ModelDialog
                key={editingModel ? `edit-${editingModel.id}` : "new-model"}
                isOpen={modelDialogOpen}
                onClose={() => {
                  setModelDialogOpen(false);
                  setEditingModel(null);
                }}
                onSave={handleSaveModel}
                initialData={editingModel}
                categories={categoryData.items}
                isSaving={isSaving}
              />
            )}
          </div>
        )}
      </motion.div>
    </MotionConfig>
  );
};
