export interface AuditControl {
  id: string;
  name: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective';
  relatedStepId: string;
}

export interface AuditWeakness {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  relatedStepId: string;
  recommendation?: string;
}

export interface AuditStep {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  order: number;
  duration?: string;
  responsible?: string;
}

export interface Department {
  id: string;
  name: string;
  color?: string;
}

export interface AuditProcessJSON {
  processName: string;
  description?: string;
  departments: Department[];
  steps: AuditStep[];
  controls: AuditControl[];
  weaknesses: AuditWeakness[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  messages: ChatMessage[];
  current_json: AuditProcessJSON | null;
  is_completed: boolean;
  session_id?: string | null;
  expires_at?: string | null;
}
