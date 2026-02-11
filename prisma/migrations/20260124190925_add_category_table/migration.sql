-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

-- Add categoryId to Course table
ALTER TABLE "Course" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "Course_categoryId_idx" ON "Course"("categoryId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default categories
INSERT INTO "Category" ("id", "name", "slug", "description", "icon", "color", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
('cat_business_001', 'Make Money & Business', 'business', 'Learn to make money and grow your business with AI', 'DollarSign', '#10B981', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat_content_002', 'Create Content & Video', 'content', 'Create engaging content and videos using AI tools', 'Video', '#8B5CF6', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat_marketing_003', 'Marketing & Traffic', 'marketing', 'Master marketing strategies and drive traffic with AI', 'Megaphone', '#F59E0B', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat_apps_004', 'Build Apps & Tech', 'apps', 'Build applications and tech solutions with AI', 'Code', '#3B82F6', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cat_productivity_005', 'Productivity & Tools', 'productivity', 'Boost productivity with AI-powered tools', 'Zap', '#EF4444', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Link existing courses to categories based on their category field
UPDATE "Course" 
SET "categoryId" = (
    SELECT "id" FROM "Category" WHERE "Category"."slug" = "Course"."category"
)
WHERE "category" IS NOT NULL;
