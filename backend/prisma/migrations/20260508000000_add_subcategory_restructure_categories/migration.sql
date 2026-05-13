-- ────────────────────────────────────────────────────────────────────────────
-- Migration: Restructure memorial categories + add subcategory
--
-- What this does:
--   1. Creates a new MemorialSubcategory enum for the granular values
--      (old categories like HEART_DISEASE, CANCER, etc. become subcategories
--      of the new top-level ILLNESSES category).
--   2. Adds a nullable `subcategory` column to `memorials`.
--   3. Back-fills subcategory for all existing illness/accident rows.
--   4. Renames the old MemorialCategory enum out of the way.
--   5. Creates the new MemorialCategory enum (10 parent categories).
--   6. Remaps the `category` column using a text-staging approach
--      (safest pattern for Postgres enum replacement).
--   7. Cleans up.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Create MemorialSubcategory enum
CREATE TYPE "MemorialSubcategory" AS ENUM (
  -- Illnesses
  'HEART_DISEASE',
  'CANCER',
  'COVID_19',
  'STROKE',
  'RESPIRATORY_DISEASE',
  'ALZHEIMERS_DEMENTIA',
  'DIABETES',
  'KIDNEY_DISEASE',
  'RARE_DISEASE',
  'CHRONIC_ILLNESS',
  -- Victims of Events
  'ACCIDENT_ROAD',
  'ACCIDENT_WORKPLACE',
  'FIRE',
  'NATURAL_DISASTER',
  'ATTACK',
  'CRIME',
  'FEMICIDE',
  -- Stars / Public Figures
  'LOCAL_CELEBRITY',
  'ACTOR',
  'ATHLETE',
  'MUSICIAN',
  'MEDIA_PERSONALITY',
  'INFLUENCER',
  'POLITICAL_LEADER',
  -- Everyday Heroes
  'FIREFIGHTER',
  'MILITARY',
  'POLICE',
  'HEALTHCARE_WORKER',
  'JOURNALIST',
  'VOLUNTEER',
  -- Creators / Inspirations / Pioneers
  'ARTIST',
  'WRITER',
  'ARTISAN',
  'INNOVATOR',
  'SCIENTIST',
  'THINKER',
  -- Children
  'CHILD_DECEASED',
  'STILLBORN_INFANT',
  -- Missing Persons
  'ONGOING_SEARCH',
  -- Elderly
  'AGE_RELATED',
  'NATURAL_CAUSES'
);

-- 2. Add nullable subcategory column
ALTER TABLE "memorials" ADD COLUMN "subcategory" "MemorialSubcategory";

-- 3. Back-fill subcategory for illness categories (they directly map)
UPDATE "memorials" SET "subcategory" = 'HEART_DISEASE'::"MemorialSubcategory"
  WHERE "category"::text = 'HEART_DISEASE';
UPDATE "memorials" SET "subcategory" = 'CANCER'::"MemorialSubcategory"
  WHERE "category"::text = 'CANCER';
UPDATE "memorials" SET "subcategory" = 'COVID_19'::"MemorialSubcategory"
  WHERE "category"::text = 'COVID_19';
UPDATE "memorials" SET "subcategory" = 'STROKE'::"MemorialSubcategory"
  WHERE "category"::text = 'STROKE';
UPDATE "memorials" SET "subcategory" = 'RESPIRATORY_DISEASE'::"MemorialSubcategory"
  WHERE "category"::text = 'RESPIRATORY_DISEASE';
UPDATE "memorials" SET "subcategory" = 'ALZHEIMERS_DEMENTIA'::"MemorialSubcategory"
  WHERE "category"::text = 'ALZHEIMERS_DEMENTIA';
UPDATE "memorials" SET "subcategory" = 'DIABETES'::"MemorialSubcategory"
  WHERE "category"::text = 'DIABETES';
UPDATE "memorials" SET "subcategory" = 'KIDNEY_DISEASE'::"MemorialSubcategory"
  WHERE "category"::text = 'KIDNEY_DISEASE';
-- ACCIDENT → VICTIMS_OF_EVENTS at top level; subcategory left null
--   (we cannot determine road vs workplace after the fact)

-- 4. Rename old enum out of the way
ALTER TYPE "MemorialCategory" RENAME TO "MemorialCategory__old";

-- 5. Create new top-level MemorialCategory enum
CREATE TYPE "MemorialCategory" AS ENUM (
  'STARS_PUBLIC_FIGURES',
  'CHILDREN',
  'ILLNESSES',
  'CREATORS_INSPIRATIONS_PIONEERS',
  'EVERYDAY_HEROES',
  'VICTIMS_OF_EVENTS',
  'MISSING_PERSONS',
  'SUICIDE',
  'ELDERLY',
  'OTHER'
);

-- 6. Stage category values as text, drop old column, add new typed column, restore
ALTER TABLE "memorials" ADD COLUMN "category_new" TEXT;

UPDATE "memorials" SET "category_new" =
  CASE "category"::text
    WHEN 'HEART_DISEASE'       THEN 'ILLNESSES'
    WHEN 'CANCER'              THEN 'ILLNESSES'
    WHEN 'COVID_19'            THEN 'ILLNESSES'
    WHEN 'STROKE'              THEN 'ILLNESSES'
    WHEN 'RESPIRATORY_DISEASE' THEN 'ILLNESSES'
    WHEN 'ALZHEIMERS_DEMENTIA' THEN 'ILLNESSES'
    WHEN 'DIABETES'            THEN 'ILLNESSES'
    WHEN 'KIDNEY_DISEASE'      THEN 'ILLNESSES'
    WHEN 'ACCIDENT'            THEN 'VICTIMS_OF_EVENTS'
    WHEN 'SUICIDE'             THEN 'SUICIDE'
    WHEN 'OTHER'               THEN 'OTHER'
    ELSE 'OTHER'
  END;

ALTER TABLE "memorials" DROP COLUMN "category";

ALTER TABLE "memorials"
  ADD COLUMN "category" "MemorialCategory" NOT NULL DEFAULT 'OTHER';

UPDATE "memorials"
  SET "category" = "category_new"::"MemorialCategory";

ALTER TABLE "memorials" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "memorials" DROP COLUMN "category_new";

-- 7. Clean up old enum
DROP TYPE "MemorialCategory__old";
