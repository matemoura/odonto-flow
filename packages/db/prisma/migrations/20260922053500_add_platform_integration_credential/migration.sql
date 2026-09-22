-- CreateTable
CREATE TABLE "platform_integration_credentials" (
    "id" TEXT NOT NULL,
    "kind" "IntegrationKind" NOT NULL,
    "providerName" TEXT NOT NULL,
    "config" JSONB,
    "secret" TEXT,
    "connectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_integration_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_integration_credentials_kind_key" ON "platform_integration_credentials"("kind");
