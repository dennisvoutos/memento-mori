import type { ReactNode } from 'react';
import {
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
} from '@ant-design/icons';
import { MemorialCategory } from '@memento-mori/shared';

export interface CategoryMeta {
  value: string;
  label: string;
  icon: ReactNode;
  description: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  [MemorialCategory.HEART_DISEASE]: {
    value: MemorialCategory.HEART_DISEASE,
    label: 'Heart Disease',
    icon: <HeartOutlined />,
    description: 'Memorials for those lost to heart disease and cardiovascular conditions.',
  },
  [MemorialCategory.CANCER]: {
    value: MemorialCategory.CANCER,
    label: 'Cancer',
    icon: <MedicineBoxOutlined />,
    description: 'Memorials honoring those who fought cancer.',
  },
  [MemorialCategory.COVID_19]: {
    value: MemorialCategory.COVID_19,
    label: 'COVID-19',
    icon: <AlertOutlined />,
    description: 'Remembering lives lost during the COVID-19 pandemic.',
  },
  [MemorialCategory.ACCIDENT]: {
    value: MemorialCategory.ACCIDENT,
    label: 'Accident',
    icon: <CarOutlined />,
    description: 'Memorials for those lost in accidents and unintentional injuries.',
  },
  [MemorialCategory.STROKE]: {
    value: MemorialCategory.STROKE,
    label: 'Stroke',
    icon: <ThunderboltOutlined />,
    description: 'Memorials for those lost to stroke and cerebrovascular disease.',
  },
  [MemorialCategory.RESPIRATORY_DISEASE]: {
    value: MemorialCategory.RESPIRATORY_DISEASE,
    label: 'Respiratory Disease',
    icon: <ExperimentOutlined />,
    description: 'Memorials for those lost to chronic respiratory conditions.',
  },
  [MemorialCategory.ALZHEIMERS_DEMENTIA]: {
    value: MemorialCategory.ALZHEIMERS_DEMENTIA,
    label: "Alzheimer's / Dementia",
    icon: <QuestionCircleOutlined />,
    description: "Memorials for those lost to Alzheimer's disease and other dementias.",
  },
  [MemorialCategory.DIABETES]: {
    value: MemorialCategory.DIABETES,
    label: 'Diabetes',
    icon: <MedicineBoxOutlined />,
    description: 'Memorials for those lost to diabetes-related complications.',
  },
  [MemorialCategory.SUICIDE]: {
    value: MemorialCategory.SUICIDE,
    label: 'Suicide',
    icon: <FrownOutlined />,
    description: 'Memorials honoring those lost to suicide. You are not alone.',
  },
  [MemorialCategory.KIDNEY_DISEASE]: {
    value: MemorialCategory.KIDNEY_DISEASE,
    label: 'Kidney Disease',
    icon: <WarningOutlined />,
    description: 'Memorials for those lost to kidney disease and related conditions.',
  },
  [MemorialCategory.OTHER]: {
    value: MemorialCategory.OTHER,
    label: 'Other',
    icon: <AppstoreOutlined />,
    description: 'Memorials for other causes or unspecified.',
  },
};

/** Flat array for Select/option lists. */
export const CATEGORY_OPTIONS = Object.values(CATEGORY_META).map(({ value, label }) => ({
  value,
  label,
}));

/** Simplified array for Landing page cards (no description). */
export const CATEGORY_LIST = Object.values(CATEGORY_META).map(({ value, label, icon }) => ({
  value,
  label,
  icon,
}));
