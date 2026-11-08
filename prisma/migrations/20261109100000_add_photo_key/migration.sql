ALTER TABLE "product_image" ADD COLUMN "key" TEXT;

CREATE UNIQUE INDEX "product_image_key_key" ON "product_image"("key");
