ALTER TABLE "users"
ALTER COLUMN "password_hash" DROP NOT NULL;

ALTER TABLE "users"
ADD COLUMN "google_id" TEXT,
ADD COLUMN "google_email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "google_linked_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");