-- CreateTable
CREATE TABLE "asset_category" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_model" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelCode" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "modelId" TEXT,
    "brand" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchaseCost" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "vendorName" TEXT,
    "invoiceNumber" TEXT,
    "warrantyStartDate" TIMESTAMP(3),
    "warrantyEndDate" TIMESTAMP(3),
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "currentLocationId" TEXT,
    "currentDepartmentId" TEXT,
    "activeAssignmentId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_assignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "membershipId" TEXT,
    "assigneeUserId" TEXT NOT NULL,
    "assigneeName" TEXT NOT NULL,
    "assigneeEmail" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "departmentId" TEXT,
    "departmentName" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "assignmentCondition" TEXT NOT NULL DEFAULT 'GOOD',
    "returnCondition" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_category_organizationId_idx" ON "asset_category"("organizationId");

-- CreateIndex
CREATE INDEX "asset_category_organizationId_isActive_idx" ON "asset_category"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "asset_category_organizationId_code_key" ON "asset_category"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "asset_category_organizationId_name_key" ON "asset_category"("organizationId", "name");

-- CreateIndex
CREATE INDEX "asset_model_organizationId_idx" ON "asset_model"("organizationId");

-- CreateIndex
CREATE INDEX "asset_model_categoryId_idx" ON "asset_model"("categoryId");

-- CreateIndex
CREATE INDEX "asset_model_organizationId_isActive_idx" ON "asset_model"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "asset_model_organizationId_brand_modelName_key" ON "asset_model"("organizationId", "brand", "modelName");

-- CreateIndex
CREATE UNIQUE INDEX "asset_model_organizationId_modelCode_key" ON "asset_model"("organizationId", "modelCode");

-- CreateIndex
CREATE UNIQUE INDEX "asset_activeAssignmentId_key" ON "asset"("activeAssignmentId");

-- CreateIndex
CREATE INDEX "asset_organizationId_idx" ON "asset"("organizationId");

-- CreateIndex
CREATE INDEX "asset_organizationId_status_idx" ON "asset"("organizationId", "status");

-- CreateIndex
CREATE INDEX "asset_categoryId_idx" ON "asset"("categoryId");

-- CreateIndex
CREATE INDEX "asset_modelId_idx" ON "asset"("modelId");

-- CreateIndex
CREATE INDEX "asset_currentLocationId_idx" ON "asset"("currentLocationId");

-- CreateIndex
CREATE INDEX "asset_organizationId_archivedAt_idx" ON "asset"("organizationId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "asset_organizationId_assetTag_key" ON "asset"("organizationId", "assetTag");

-- CreateIndex
CREATE UNIQUE INDEX "asset_organizationId_serialNumber_key" ON "asset"("organizationId", "serialNumber");

-- CreateIndex
CREATE INDEX "asset_assignment_organizationId_idx" ON "asset_assignment"("organizationId");

-- CreateIndex
CREATE INDEX "asset_assignment_assetId_idx" ON "asset_assignment"("assetId");

-- CreateIndex
CREATE INDEX "asset_assignment_organizationId_assetId_idx" ON "asset_assignment"("organizationId", "assetId");

-- CreateIndex
CREATE INDEX "asset_assignment_membershipId_idx" ON "asset_assignment"("membershipId");

-- CreateIndex
CREATE INDEX "asset_history_organizationId_idx" ON "asset_history"("organizationId");

-- CreateIndex
CREATE INDEX "asset_history_assetId_idx" ON "asset_history"("assetId");

-- CreateIndex
CREATE INDEX "asset_history_organizationId_assetId_idx" ON "asset_history"("organizationId", "assetId");

-- AddForeignKey
ALTER TABLE "asset_category" ADD CONSTRAINT "asset_category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_model" ADD CONSTRAINT "asset_model_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_model" ADD CONSTRAINT "asset_model_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "asset_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_currentDepartmentId_fkey" FOREIGN KEY ("currentDepartmentId") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_activeAssignmentId_fkey" FOREIGN KEY ("activeAssignmentId") REFERENCES "asset_assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignment" ADD CONSTRAINT "asset_assignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignment" ADD CONSTRAINT "asset_assignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignment" ADD CONSTRAINT "asset_assignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignment" ADD CONSTRAINT "asset_assignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignment" ADD CONSTRAINT "asset_assignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
