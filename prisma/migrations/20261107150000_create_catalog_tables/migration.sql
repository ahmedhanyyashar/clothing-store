-- CreateEnum
CREATE TYPE "Category" AS ENUM ('MEN', 'WOMEN', 'CHILDREN');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('T_SHIRTS', 'SHIRTS', 'HOODIES', 'JACKETS', 'JEANS', 'SHOES');

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "category" "Category" NOT NULL,
    "type" "ProductType" NOT NULL,
    "bestSeller" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_image" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_size" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_size_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_color" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,

    CONSTRAINT "product_color_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_category_type_idx" ON "product"("category", "type");

-- CreateIndex
CREATE INDEX "product_createdAt_idx" ON "product"("createdAt");

-- CreateIndex
CREATE INDEX "product_image_productId_idx" ON "product_image"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_size_productId_label_key" ON "product_size"("productId", "label");

-- CreateIndex
CREATE INDEX "product_color_productId_idx" ON "product_color"("productId");

-- AddForeignKey
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_size" ADD CONSTRAINT "product_size_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_color" ADD CONSTRAINT "product_color_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backstops that Prisma cannot express: money and stock are never negative,
-- whatever the application does.
ALTER TABLE "product" ADD CONSTRAINT "product_price_non_negative" CHECK ("priceCents" >= 0);
ALTER TABLE "product_size" ADD CONSTRAINT "product_size_stock_non_negative" CHECK ("stock" >= 0);
