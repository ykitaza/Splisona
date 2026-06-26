export interface UserRecord {
  PK: `USER#${string}`;
  SK: `USER#${string}`;
  email: string;
  createdAt: string;
}

export interface PersonaRecord {
  PK: `USER#${string}`;
  SK: `PERSONA#${string}`;
  displayName: string;
  type: string;
  source?: "preset" | "ai";
  age?: number;
  gender?: string;
  occupation?: string;
  deviationScore?: number;
  annualIncome?: number;
  education?: string;
  freeText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ABTestRecord {
  PK: `USER#${string}`;
  SK: `ABTEST#${string}`;
  title: string;
  status: "draft" | "running" | "completed" | "failed";
  designAImageKey?: string;
  designBImageKey?: string;
  designAInputType: "image_upload" | "figma_url" | "site_url";
  designBInputType: "image_upload" | "figma_url" | "site_url";
  designAUrl?: string;
  designBUrl?: string;
  personaIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationRecord {
  PK: `ABTEST#${string}`;
  SK: `EVAL#${string}`;
  winner: "A" | "B" | "none";
  confidence: number;
  reason: string;
  scores: {
    usability: number;
    aesthetics: number;
    clarity: number;
    engagement: number;
  };
  status: "completed" | "failed";
  personaDisplayName: string;
  evaluatedAt: string;
}
