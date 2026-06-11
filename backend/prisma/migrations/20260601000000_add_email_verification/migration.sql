ALTER TABLE "users"
ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "verification_token_hash" TEXT,
ADD COLUMN "verification_expires" TIMESTAMP(3);

UPDATE "users"
SET "email_verified" = true;

CREATE UNIQUE INDEX "users_verification_token_hash_key"
ON "users"("verification_token_hash");