export interface ProcessStep {
  id: string;
  text: string;
  department: string;
  type: 'process' | 'decision' | 'control' | 'start' | 'end';
  isControl: boolean;
}

export interface Control {
  id: string;
  description: string;
  stepId: string;
  type: string;
}

export interface Weakness {
  id: string;
  description: string;
  stepId: string;
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

const controlKeywords = [
  'requires approval', 'authorization', 'review', 'reconciliation',
  'verification', 'validation', 'segregation of duties', 'dual authorization',
  'system check', 'automated control', 'password', 'access control',
  'supervisor approval', 'manager sign-off', 'documented', 'audit trail'
];

const weaknessIndicators = [
  'no approval', 'manual process', 'no review', 'no segregation',
  'no verification', 'single person', 'no documentation', 'no backup',
  'no reconciliation', 'override', 'bypass', 'unrestricted access'
];

const departmentKeywords = [
  'accounts payable', 'accounts receivable', 'finance', 'accounting',
  'treasury', 'it department', 'sales', 'purchasing', 'inventory',
  'warehouse', 'operations', 'management', 'hr', 'human resources',
  'payroll', 'audit', 'compliance', 'legal', 'administration'
];

const decisionKeywords = [
  'if', 'whether', 'decides', 'determines', 'checks if', 'evaluates',
  'reviews if', 'approves or rejects', 'yes/no', 'approved?', 'valid?'
];

export function parseNarrative(narrative: string): {
  steps: ProcessStep[];
  controls: Control[];
  weaknesses: Weakness[];
  departments: string[];
} {
  const sentences = narrative
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const departments = extractDepartments(narrative);
  const steps: ProcessStep[] = [];
  const controls: Control[] = [];
  const weaknesses: Weakness[] = [];

  let currentDepartment = departments[0] || 'General';
  let stepCounter = 0;

  sentences.forEach((sentence, index) => {
    const detectedDept = detectDepartment(sentence);
    if (detectedDept) {
      currentDepartment = detectedDept;
    }

    const isControl = isControlActivity(sentence);
    const isDecision = isDecisionPoint(sentence);

    let stepType: ProcessStep['type'] = 'process';

    if (index === 0 && (sentence.toLowerCase().includes('start') || sentence.toLowerCase().includes('begin'))) {
      stepType = 'start';
    } else if (sentence.toLowerCase().includes('end') || sentence.toLowerCase().includes('complete')) {
      stepType = 'end';
    } else if (isControl) {
      stepType = 'control';
    } else if (isDecision) {
      stepType = 'decision';
    }

    const stepId = `step-${stepCounter++}`;

    steps.push({
      id: stepId,
      text: sentence,
      department: currentDepartment,
      type: stepType,
      isControl
    });

    if (isControl) {
      controls.push({
        id: `ctrl-${controls.length}`,
        description: sentence,
        stepId,
        type: detectControlType(sentence)
      });
    }

    const weakness = detectWeakness(sentence);
    if (weakness) {
      weaknesses.push({
        id: `weak-${weaknesses.length}`,
        description: weakness.description,
        stepId,
        severity: weakness.severity,
        recommendation: weakness.recommendation
      });
    }
  });

  if (steps.length > 0 && steps[0].type === 'process') {
    steps[0].type = 'start';
  }
  if (steps.length > 1 && steps[steps.length - 1].type === 'process') {
    steps[steps.length - 1].type = 'end';
  }

  return { steps, controls, weaknesses, departments };
}

function extractDepartments(text: string): string[] {
  const found = new Set<string>();
  const lowerText = text.toLowerCase();

  departmentKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      found.add(toTitleCase(keyword));
    }
  });

  if (found.size === 0) {
    found.add('General');
  }

  return Array.from(found);
}

function detectDepartment(sentence: string): string | null {
  const lowerSentence = sentence.toLowerCase();

  for (const keyword of departmentKeywords) {
    if (lowerSentence.includes(keyword)) {
      return toTitleCase(keyword);
    }
  }

  return null;
}

function isControlActivity(sentence: string): boolean {
  const lowerSentence = sentence.toLowerCase();
  return controlKeywords.some(keyword => lowerSentence.includes(keyword));
}

function isDecisionPoint(sentence: string): boolean {
  const lowerSentence = sentence.toLowerCase();
  return decisionKeywords.some(keyword => lowerSentence.includes(keyword));
}

function detectControlType(sentence: string): string {
  const lowerSentence = sentence.toLowerCase();

  if (lowerSentence.includes('approval') || lowerSentence.includes('authorization')) {
    return 'Authorization';
  }
  if (lowerSentence.includes('reconciliation')) {
    return 'Reconciliation';
  }
  if (lowerSentence.includes('verification') || lowerSentence.includes('validation')) {
    return 'Verification';
  }
  if (lowerSentence.includes('segregation')) {
    return 'Segregation of Duties';
  }
  if (lowerSentence.includes('review')) {
    return 'Review';
  }
  if (lowerSentence.includes('system') || lowerSentence.includes('automated')) {
    return 'Automated Control';
  }

  return 'General Control';
}

function detectWeakness(sentence: string): { description: string; severity: 'high' | 'medium' | 'low'; recommendation: string } | null {
  const lowerSentence = sentence.toLowerCase();

  for (const indicator of weaknessIndicators) {
    if (lowerSentence.includes(indicator)) {
      let severity: 'high' | 'medium' | 'low' = 'medium';
      let recommendation = '';

      if (indicator.includes('no segregation') || indicator.includes('unrestricted access')) {
        severity = 'high';
        recommendation = 'Implement segregation of duties to prevent fraud and errors';
      } else if (indicator.includes('no approval') || indicator.includes('no review')) {
        severity = 'high';
        recommendation = 'Implement approval workflow to ensure proper authorization';
      } else if (indicator.includes('manual process')) {
        severity = 'medium';
        recommendation = 'Consider automation to reduce manual errors';
      } else if (indicator.includes('no documentation')) {
        severity = 'medium';
        recommendation = 'Implement documentation requirements for audit trail';
      } else if (indicator.includes('single person')) {
        severity = 'high';
        recommendation = 'Require dual authorization for critical transactions';
      } else {
        recommendation = 'Review and implement appropriate controls';
      }

      return {
        description: `Potential weakness detected: ${indicator}`,
        severity,
        recommendation
      };
    }
  }

  return null;
}

function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
