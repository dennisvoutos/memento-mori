/*
  Warnings:

  - The values [IN_LOVING_MEMORY,TRIBUTE,LIFE_STORY,OBITUARY,COMMUNITY] on the enum `MemorialCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MemorialCategory_new" AS ENUM ('HEART_DISEASE', 'CANCER', 'COVID_19', 'ACCIDENT', 'STROKE', 'RESPIRATORY_DISEASE', 'ALZHEIMERS_DEMENTIA', 'DIABETES', 'SUICIDE', 'KIDNEY_DISEASE', 'OTHER');
ALTER TABLE "public"."memorials" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "memorials" ALTER COLUMN "category" TYPE "MemorialCategory_new" USING ("category"::text::"MemorialCategory_new");
ALTER TYPE "MemorialCategory" RENAME TO "MemorialCategory_old";
ALTER TYPE "MemorialCategory_new" RENAME TO "MemorialCategory";
DROP TYPE "public"."MemorialCategory_old";
ALTER TABLE "memorials" ALTER COLUMN "category" SET DEFAULT 'OTHER';
COMMIT;

-- AlterTable
ALTER TABLE "memorials" ALTER COLUMN "category" SET DEFAULT 'OTHER';
