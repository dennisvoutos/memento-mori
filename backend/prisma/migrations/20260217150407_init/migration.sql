-- CreateEnum
CREATE TYPE "PrivacyLevel" AS ENUM ('PRIVATE', 'SHARED_LINK', 'PUBLIC');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('PHOTO', 'TEXT', 'TRIBUTE', 'QUOTE');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('VIEW', 'CONTRIBUTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('MESSAGE', 'CANDLE', 'REACTION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorials" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "date_of_birth" TEXT NOT NULL,
    "date_of_passing" TEXT NOT NULL,
    "biography" TEXT,
    "profile_photo_url" TEXT,
    "privacy_level" "PrivacyLevel" NOT NULL DEFAULT 'PRIVATE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memorials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "life_moments" (
    "id" TEXT NOT NULL,
    "memorial_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "life_moments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memories" (
    "id" TEXT NOT NULL,
    "memorial_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "type" "MemoryType" NOT NULL,
    "content" TEXT,
    "media_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorial_access" (
    "id" TEXT NOT NULL,
    "memorial_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT,
    "access_token" TEXT,
    "permission" "Permission" NOT NULL DEFAULT 'VIEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memorial_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_interactions" (
    "id" TEXT NOT NULL,
    "memorial_id" TEXT NOT NULL,
    "visitor_id" TEXT,
    "type" "InteractionType" NOT NULL,
    "content" TEXT,
    "reaction_emoji" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "memorials_owner_id_idx" ON "memorials"("owner_id");

-- CreateIndex
CREATE INDEX "life_moments_memorial_id_idx" ON "life_moments"("memorial_id");

-- CreateIndex
CREATE INDEX "memories_memorial_id_idx" ON "memories"("memorial_id");

-- CreateIndex
CREATE INDEX "memories_author_id_idx" ON "memories"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "memorial_access_access_token_key" ON "memorial_access"("access_token");

-- CreateIndex
CREATE INDEX "memorial_access_memorial_id_idx" ON "memorial_access"("memorial_id");

-- CreateIndex
CREATE INDEX "memorial_access_user_id_idx" ON "memorial_access"("user_id");

-- CreateIndex
CREATE INDEX "memorial_access_access_token_idx" ON "memorial_access"("access_token");

-- CreateIndex
CREATE INDEX "visitor_interactions_memorial_id_idx" ON "visitor_interactions"("memorial_id");

-- CreateIndex
CREATE INDEX "visitor_interactions_visitor_id_idx" ON "visitor_interactions"("visitor_id");

-- AddForeignKey
ALTER TABLE "memorials" ADD CONSTRAINT "memorials_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "life_moments" ADD CONSTRAINT "life_moments_memorial_id_fkey" FOREIGN KEY ("memorial_id") REFERENCES "memorials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_memorial_id_fkey" FOREIGN KEY ("memorial_id") REFERENCES "memorials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_access" ADD CONSTRAINT "memorial_access_memorial_id_fkey" FOREIGN KEY ("memorial_id") REFERENCES "memorials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_access" ADD CONSTRAINT "memorial_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_interactions" ADD CONSTRAINT "visitor_interactions_memorial_id_fkey" FOREIGN KEY ("memorial_id") REFERENCES "memorials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_interactions" ADD CONSTRAINT "visitor_interactions_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
