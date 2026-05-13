import type { ReactNode } from 'react';
import {
  StarOutlined,
  SmileOutlined,
  MedicineBoxOutlined,
  BulbOutlined,
  SafetyOutlined,
  AlertOutlined,
  SearchOutlined,
  FrownOutlined,
  TeamOutlined,
  AppstoreOutlined,
  HeartOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  CarOutlined,
  FireOutlined,
  CloudOutlined,
  RocketOutlined,
  UserOutlined,
  TrophyOutlined,
  SoundOutlined,
  GlobalOutlined,
  HomeOutlined,
  MehOutlined,
} from '@ant-design/icons';
import { MemorialCategory, MemorialSubcategory } from '@memento-mori/shared';

export interface SubcategoryMeta {
  value: MemorialSubcategory;
  label: string;
}

export interface CategoryMeta {
  value: MemorialCategory;
  label: string;
  icon: ReactNode;
  description: string;
  subcategories: SubcategoryMeta[];
}

export const CATEGORY_META: Record<MemorialCategory, CategoryMeta> = {
  [MemorialCategory.STARS_PUBLIC_FIGURES]: {
    value: MemorialCategory.STARS_PUBLIC_FIGURES,
    label: 'Stars & Public Figures',
    icon: <StarOutlined />,
    description: 'Memorials for local celebrities, artists, athletes, musicians, influencers, and public leaders.',
    subcategories: [
      { value: MemorialSubcategory.LOCAL_CELEBRITY, label: 'Local Celebrity' },
      { value: MemorialSubcategory.ACTOR, label: 'Actor' },
      { value: MemorialSubcategory.ATHLETE, label: 'Athlete' },
      { value: MemorialSubcategory.MUSICIAN, label: 'Musician' },
      { value: MemorialSubcategory.MEDIA_PERSONALITY, label: 'Media Personality' },
      { value: MemorialSubcategory.INFLUENCER, label: 'Influencer' },
      { value: MemorialSubcategory.POLITICAL_LEADER, label: 'Political Leader' },
    ],
  },
  [MemorialCategory.CHILDREN]: {
    value: MemorialCategory.CHILDREN,
    label: 'Children',
    icon: <SmileOutlined />,
    description: 'Memorials for children and stillborn infants, remembered with love.',
    subcategories: [
      { value: MemorialSubcategory.CHILD_DECEASED, label: 'Child' },
      { value: MemorialSubcategory.STILLBORN_INFANT, label: 'Stillborn Infant' },
    ],
  },
  [MemorialCategory.ILLNESSES]: {
    value: MemorialCategory.ILLNESSES,
    label: 'Illnesses',
    icon: <MedicineBoxOutlined />,
    description: 'Memorials for those who lost their lives to cancer, COVID-19, rare diseases, chronic conditions, and more.',
    subcategories: [
      { value: MemorialSubcategory.CANCER, label: 'Cancer' },
      { value: MemorialSubcategory.COVID_19, label: 'COVID-19' },
      { value: MemorialSubcategory.HEART_DISEASE, label: 'Heart Disease' },
      { value: MemorialSubcategory.STROKE, label: 'Stroke' },
      { value: MemorialSubcategory.RESPIRATORY_DISEASE, label: 'Respiratory Disease' },
      { value: MemorialSubcategory.ALZHEIMERS_DEMENTIA, label: "Alzheimer's / Dementia" },
      { value: MemorialSubcategory.DIABETES, label: 'Diabetes' },
      { value: MemorialSubcategory.KIDNEY_DISEASE, label: 'Kidney Disease' },
      { value: MemorialSubcategory.RARE_DISEASE, label: 'Rare Disease' },
      { value: MemorialSubcategory.CHRONIC_ILLNESS, label: 'Chronic Illness' },
    ],
  },
  [MemorialCategory.CREATORS_INSPIRATIONS_PIONEERS]: {
    value: MemorialCategory.CREATORS_INSPIRATIONS_PIONEERS,
    label: 'Creators, Inspirations & Pioneers',
    icon: <BulbOutlined />,
    description: 'Honoring artists, writers, scientists, innovators, and thinkers who changed the world.',
    subcategories: [
      { value: MemorialSubcategory.ARTIST, label: 'Artist' },
      { value: MemorialSubcategory.WRITER, label: 'Writer' },
      { value: MemorialSubcategory.ARTISAN, label: 'Artisan' },
      { value: MemorialSubcategory.INNOVATOR, label: 'Innovator' },
      { value: MemorialSubcategory.SCIENTIST, label: 'Scientist' },
      { value: MemorialSubcategory.THINKER, label: 'Thinker / Philosopher' },
    ],
  },
  [MemorialCategory.EVERYDAY_HEROES]: {
    value: MemorialCategory.EVERYDAY_HEROES,
    label: 'Everyday Heroes',
    icon: <SafetyOutlined />,
    description: 'Remembering firefighters, military, police, healthcare workers, journalists, and volunteers.',
    subcategories: [
      { value: MemorialSubcategory.FIREFIGHTER, label: 'Firefighter' },
      { value: MemorialSubcategory.MILITARY, label: 'Military' },
      { value: MemorialSubcategory.POLICE, label: 'Police' },
      { value: MemorialSubcategory.HEALTHCARE_WORKER, label: 'Healthcare Worker' },
      { value: MemorialSubcategory.JOURNALIST, label: 'Journalist' },
      { value: MemorialSubcategory.VOLUNTEER, label: 'Volunteer' },
    ],
  },
  [MemorialCategory.VICTIMS_OF_EVENTS]: {
    value: MemorialCategory.VICTIMS_OF_EVENTS,
    label: 'Victims of Events',
    icon: <AlertOutlined />,
    description: 'Memorials for victims of accidents, natural disasters, fires, attacks, crimes, and femicides.',
    subcategories: [
      { value: MemorialSubcategory.ACCIDENT_ROAD, label: 'Road Accident' },
      { value: MemorialSubcategory.ACCIDENT_WORKPLACE, label: 'Workplace Accident' },
      { value: MemorialSubcategory.FIRE, label: 'Fire' },
      { value: MemorialSubcategory.NATURAL_DISASTER, label: 'Natural Disaster' },
      { value: MemorialSubcategory.ATTACK, label: 'Attack' },
      { value: MemorialSubcategory.CRIME, label: 'Crime' },
      { value: MemorialSubcategory.FEMICIDE, label: 'Femicide' },
    ],
  },
  [MemorialCategory.MISSING_PERSONS]: {
    value: MemorialCategory.MISSING_PERSONS,
    label: 'Missing Persons',
    icon: <SearchOutlined />,
    description: 'A dedicated space with hope for those still being searched for.',
    subcategories: [
      { value: MemorialSubcategory.ONGOING_SEARCH, label: 'Ongoing Search' },
    ],
  },
  [MemorialCategory.SUICIDE]: {
    value: MemorialCategory.SUICIDE,
    label: 'Suicide',
    icon: <FrownOutlined />,
    description: 'Memorials for those lost to suicide. Support and prevention resources are available. You are not alone.',
    subcategories: [],
  },
  [MemorialCategory.ELDERLY]: {
    value: MemorialCategory.ELDERLY,
    label: 'Elderly',
    icon: <TeamOutlined />,
    description: 'Honoring those who passed from age-related or natural causes.',
    subcategories: [
      { value: MemorialSubcategory.AGE_RELATED, label: 'Age-Related' },
      { value: MemorialSubcategory.NATURAL_CAUSES, label: 'Natural Causes' },
    ],
  },
  [MemorialCategory.OTHER]: {
    value: MemorialCategory.OTHER,
    label: 'Other',
    icon: <AppstoreOutlined />,
    description: 'Memorials for other causes or unspecified.',
    subcategories: [],
  },
};

/** Flat array for top-level category Select/option lists. */
export const CATEGORY_OPTIONS = Object.values(CATEGORY_META).map(({ value, label }) => ({
  value,
  label,
}));

/** Subcategory options for a given parent category. */
export function getSubcategoryOptions(category: MemorialCategory | string | null | undefined) {
  if (!category) return [];
  const meta = CATEGORY_META[category as MemorialCategory];
  if (!meta) return [];
  return meta.subcategories.map(({ value, label }) => ({ value, label }));
}

/** Simplified array for Landing page cards (no description). */
export const CATEGORY_LIST = Object.values(CATEGORY_META).map(({ value, label, icon }) => ({
  value,
  label,
  icon,
}));

/** Human-readable label for a category value. */
export function getCategoryLabel(category: string | null | undefined): string {
  if (!category) return '';
  return CATEGORY_META[category as MemorialCategory]?.label ?? category;
}

/** Human-readable label for a subcategory value. */
export function getSubcategoryLabel(subcategory: string | null | undefined): string {
  if (!subcategory) return '';
  for (const meta of Object.values(CATEGORY_META)) {
    const found = meta.subcategories.find((s) => s.value === subcategory);
    if (found) return found.label;
  }
  return subcategory;
}

// Re-export icons used in legacy references so any surviving import still resolves.
export {
  HeartOutlined,
  MedicineBoxOutlined,
  AlertOutlined,
  CarOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  FrownOutlined,
  AppstoreOutlined,
  StarOutlined,
  SmileOutlined,
  BulbOutlined,
  SafetyOutlined,
  SearchOutlined,
  TeamOutlined,
  FireOutlined,
  CloudOutlined,
  RocketOutlined,
  UserOutlined,
  TrophyOutlined,
  SoundOutlined,
  GlobalOutlined,
  HomeOutlined,
  MehOutlined,
};
