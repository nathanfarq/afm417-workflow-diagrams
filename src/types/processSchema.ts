// New PRD-compliant schema types for v2 implementation
// Based on PRD Section 2.1

export interface Actor {
  id: string;
  name: string;
  department?: string;
}

export interface ProcessStep {
  id: string;
  type: 'action' | 'decision' | 'start' | 'end';
  label: string;
  actorId: string;
  description?: string;
  controls: string[]; // Array of control IDs
  risks: string[]; // Array of risk IDs
  position?: {
    x?: number;
    y?: number;
  };
}

export interface DecisionOutcome {
  label: string; // e.g., "Approved", "Rejected"
  nextStepId: string;
}

export interface Decision {
  id: string;
  stepId: string; // References ProcessStep.id
  criteria: string; // Decision logic description
  outcomes: DecisionOutcome[];
}

export interface Control {
  id: string;
  type: 'preventive' | 'detective' | 'corrective';
  description: string; // Max 50 chars for diagram display
  detailedDescription: string; // Full description
}

export interface Risk {
  id: string;
  description: string; // Max 50 chars for diagram display
  severity: 'low' | 'medium' | 'high';
  detailedDescription: string; // Full description
}

export interface Flow {
  from: string; // Step ID
  to: string; // Step ID
  label?: string; // Optional, for decision branches
  type: 'normal' | 'conditional';
}

export interface ProcessSchema {
  processName: string;
  processId: string; // UUID
  lastUpdated: string; // ISO 8601 timestamp
  actors: Actor[];
  steps: ProcessStep[];
  decisions: Decision[];
  controls: Control[];
  risks: Risk[];
  flows: Flow[];
}

// Schema version for database migration
export const PROCESS_SCHEMA_VERSION = '2.0';

// Validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Chat message types (reuse from existing)
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Conversation with versioning
export interface ConversationV2 {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  messages: ChatMessage[];
  current_json: ProcessSchema | null;
  is_completed: boolean;
  session_id?: string | null;
  expires_at?: string | null;
  schema_version: string; // '2.0'
}

// Helper type guards
export function isProcessSchema(obj: unknown): obj is ProcessSchema {
  if (!obj || typeof obj !== 'object') return false;
  const schema = obj as ProcessSchema;
  return (
    typeof schema.processName === 'string' &&
    typeof schema.processId === 'string' &&
    Array.isArray(schema.actors) &&
    Array.isArray(schema.steps) &&
    Array.isArray(schema.decisions) &&
    Array.isArray(schema.controls) &&
    Array.isArray(schema.risks) &&
    Array.isArray(schema.flows)
  );
}
