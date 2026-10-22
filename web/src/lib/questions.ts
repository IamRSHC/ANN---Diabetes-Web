import type { Answers } from './types';

export const AGE_BANDS = ['18-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80+'];
export const EDUCATION = ['Never attended / kindergarten', 'Grades 1-8', 'Grades 9-11', 'High-school graduate', 'Some college', 'College graduate'];
export const INCOME = ['Below $10k', '$10k-15k', '$15k-20k', '$20k-25k', '$25k-35k', '$35k-50k', '$50k-75k', 'Above $75k'];
export const GENHLTH = ['Excellent', 'Very good', 'Good', 'Fair', 'Poor'];

export const LABELS: Record<string, string> = {
  HighBP: 'High blood pressure', HighChol: 'High cholesterol', CholCheck: 'Cholesterol check (5 yrs)', Smoker: 'Smoker',
  Stroke: 'Previous stroke', HeartDiseaseorAttack: 'Heart disease', PhysActivity: 'Physical activity', Fruits: 'Daily fruit',
  Veggies: 'Daily vegetables', HvyAlcoholConsump: 'Heavy drinking', AnyHealthcare: 'Health coverage', NoDocbcCost: 'Skipped doctor (cost)',
  DiffWalk: 'Difficulty walking', Sex: 'Sex', BMI: 'BMI', MentHlth: 'Poor mental-health days', PhysHlth: 'Poor physical-health days',
  GenHlth: 'General health', Age: 'Age band', Education: 'Education', Income: 'Income',
};

export interface YesNo { key: keyof Answers; question: string; hint?: string }

export const HISTORY: YesNo[] = [
  { key: 'HighBP', question: 'Told you have high blood pressure?' },
  { key: 'HighChol', question: 'Told you have high cholesterol?' },
  { key: 'CholCheck', question: 'Cholesterol checked in the last 5 years?' },
  { key: 'Stroke', question: 'Ever had a stroke?' },
  { key: 'HeartDiseaseorAttack', question: 'Heart disease or heart attack?' },
  { key: 'DiffWalk', question: 'Serious difficulty walking or climbing stairs?' },
];
export const LIFESTYLE: YesNo[] = [
  { key: 'PhysActivity', question: 'Exercise in the last 30 days (outside work)?' },
  { key: 'Fruits', question: 'Fruit at least once a day?' },
  { key: 'Veggies', question: 'Vegetables at least once a day?' },
  { key: 'Smoker', question: 'Smoked 100+ cigarettes in your life?' },
  { key: 'HvyAlcoholConsump', question: 'Heavy drinking? (men 15+, women 8+ drinks a week)' },
];
export const ACCESS: YesNo[] = [
  { key: 'AnyHealthcare', question: 'Any health-care coverage?' },
  { key: 'NoDocbcCost', question: 'Skipped a doctor in the past year due to cost?' },
];

export const DEFAULT_ANSWERS: Answers = {
  HighBP: 0, HighChol: 0, CholCheck: 1, Smoker: 0, Stroke: 0, HeartDiseaseorAttack: 0, PhysActivity: 1, Fruits: 1, Veggies: 1,
  HvyAlcoholConsump: 0, AnyHealthcare: 1, NoDocbcCost: 0, DiffWalk: 0, Sex: 0, BMI: 26, MentHlth: 0, PhysHlth: 0, GenHlth: 3,
  Age: 7, Education: 5, Income: 6,
};

export const bmiOf = (heightCm: number, weightKg: number) => weightKg / (heightCm / 100) ** 2;
export const BMI_MIN = 12;
export const BMI_MAX = 98;
