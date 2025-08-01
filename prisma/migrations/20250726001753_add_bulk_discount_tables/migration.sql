-- CreateTable
CREATE TABLE "BulkDiscount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "productHandle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "shop" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BulkDiscountTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bulkDiscountId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountPercent" REAL,
    "discountValue" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BulkDiscountTier_bulkDiscountId_fkey" FOREIGN KEY ("bulkDiscountId") REFERENCES "BulkDiscount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BulkDiscount_productId_shop_key" ON "BulkDiscount"("productId", "shop");

-- CreateIndex
CREATE INDEX "BulkDiscountTier_bulkDiscountId_idx" ON "BulkDiscountTier"("bulkDiscountId");
