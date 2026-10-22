export interface Answers {
  HighBP: number; HighChol: number; CholCheck: number; Smoker: number; Stroke: number; HeartDiseaseorAttack: number;
  PhysActivity: number; Fruits: number; Veggies: number; HvyAlcoholConsump: number; AnyHealthcare: number;
  NoDocbcCost: number; DiffWalk: number; Sex: number; BMI: number; MentHlth: number; PhysHlth: number;
  GenHlth: number; Age: number; Education: number; Income: number;
}
export type Decision = 'higher' | 'lower' | 'refer';
export interface Driver { feature: string; label: string; delta: number }
export interface AnnResult {
  risk: number; sigma: number; band: [number, number]; margin: number; tau: number; threshold: number;
  decision: Decision; passes: number[]; drivers: Driver[];
}
export interface ModelScore {
  name: string; family: 'Model 1' | 'Model 2'; risk: number; threshold: number; decision: Decision; brier: number; roc_auc: number;
}
/** models: null = not available; status tells the results page whether the API is still being asked. */
export interface Prediction { input: Answers; ann: AnnResult; models: ModelScore[] | null; status: 'loading' | 'api' | 'offline' | 'browser-only' }
