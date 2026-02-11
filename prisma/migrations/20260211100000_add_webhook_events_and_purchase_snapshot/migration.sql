-- Add pricing snapshot fields to Purchase
ALTER TABLE "Purchase"
  ADD COLUMN "priceOriginalCents" INTEGER,
  ADD COLUMN "priceDiscountCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "pricingSnapshot" JSONB;

-- Add webhook idempotency tracking
CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "transmissionId" TEXT,
  "payload" JSONB,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");
CREATE INDEX "WebhookEvent_provider_processedAt_idx" ON "WebhookEvent"("provider", "processedAt");
