/**
 * Comprehensive tests for mermaidGenerator
 * Using the Expense Reimbursement example from PRD Appendix A
 */

import { describe, it, expect } from 'vitest';
import { generateMermaidFromJson, validateProcessSchema } from './mermaidGenerator';
import type { ProcessSchema } from '../types/processSchema';

// PRD Appendix A: Expense Reimbursement Process (Complete Example)
const expenseReimbursementExample: ProcessSchema = {
  processName: 'Expense Reimbursement',
  processId: '550e8400-e29b-41d4-a716-446655440000',
  lastUpdated: '2025-11-18T10:30:00Z',
  actors: [
    {
      id: 'emp-001',
      name: 'Employee',
      department: 'All Departments'
    },
    {
      id: 'mgr-001',
      name: 'Manager',
      department: 'Management'
    },
    {
      id: 'fin-001',
      name: 'Finance Team',
      department: 'Finance'
    }
  ],
  steps: [
    {
      id: 'step-001',
      type: 'start',
      label: 'Start',
      actorId: 'emp-001',
      controls: [],
      risks: []
    },
    {
      id: 'step-002',
      type: 'action',
      label: 'Submit expense report with receipts',
      actorId: 'emp-001',
      controls: ['ctrl-001'],
      risks: []
    },
    {
      id: 'step-003',
      type: 'decision',
      label: 'Review expense report',
      actorId: 'mgr-001',
      controls: ['ctrl-002'],
      risks: ['risk-001']
    },
    {
      id: 'step-004',
      type: 'action',
      label: 'Request additional information',
      actorId: 'mgr-001',
      controls: [],
      risks: []
    },
    {
      id: 'step-005',
      type: 'action',
      label: 'Process payment',
      actorId: 'fin-001',
      controls: ['ctrl-003'],
      risks: []
    },
    {
      id: 'step-006',
      type: 'end',
      label: 'End',
      actorId: 'fin-001',
      controls: [],
      risks: []
    }
  ],
  decisions: [
    {
      id: 'dec-001',
      stepId: 'step-003',
      criteria: 'Expenses within policy and properly documented?',
      outcomes: [
        {
          label: 'Approved',
          nextStepId: 'step-005'
        },
        {
          label: 'Needs Info',
          nextStepId: 'step-004'
        }
      ]
    }
  ],
  controls: [
    {
      id: 'ctrl-001',
      type: 'preventive',
      description: 'Receipt attachment required',
      detailedDescription: 'System enforces attachment of receipts for all expenses over $25'
    },
    {
      id: 'ctrl-002',
      type: 'detective',
      description: 'Manager review of policy compliance',
      detailedDescription: 'Manager reviews expense report for compliance with policy'
    },
    {
      id: 'ctrl-003',
      type: 'preventive',
      description: 'Segregation of duties',
      detailedDescription: 'Finance processes payment only after manager approval'
    }
  ],
  risks: [
    {
      id: 'risk-001',
      description: 'Fraudulent expense approval',
      severity: 'medium',
      detailedDescription: 'Risk that manager approves inappropriate expenses'
    }
  ],
  flows: [
    {
      from: 'step-001',
      to: 'step-002',
      type: 'normal'
    },
    {
      from: 'step-002',
      to: 'step-003',
      type: 'normal'
    },
    {
      from: 'step-003',
      to: 'step-005',
      label: 'Approved',
      type: 'conditional'
    },
    {
      from: 'step-003',
      to: 'step-004',
      label: 'Needs Info',
      type: 'conditional'
    },
    {
      from: 'step-004',
      to: 'step-002',
      type: 'normal'
    },
    {
      from: 'step-005',
      to: 'step-006',
      type: 'normal'
    }
  ]
};

describe('validateProcessSchema', () => {
  it('should validate the PRD example without errors', () => {
    const errors = validateProcessSchema(expenseReimbursementExample);
    expect(errors).toEqual([]);
  });

  it('should detect missing processName', () => {
    const invalid = { ...expenseReimbursementExample, processName: '' };
    const errors = validateProcessSchema(invalid);
    expect(errors).toContain('processName is required');
  });

  it('should detect missing start node', () => {
    const invalid = {
      ...expenseReimbursementExample,
      steps: expenseReimbursementExample.steps.filter(s => s.type !== 'start')
    };
    const errors = validateProcessSchema(invalid);
    expect(errors).toContain('Process must have exactly one start node');
  });

  it('should detect multiple start nodes', () => {
    const invalid = {
      ...expenseReimbursementExample,
      steps: [
        ...expenseReimbursementExample.steps,
        { id: 'step-007', type: 'start' as const, label: 'Start 2', actorId: 'emp-001', controls: [], risks: [] }
      ]
    };
    const errors = validateProcessSchema(invalid);
    expect(errors).toContain('Process must have exactly one start node (found multiple)');
  });

  it('should detect missing end node', () => {
    const invalid = {
      ...expenseReimbursementExample,
      steps: expenseReimbursementExample.steps.filter(s => s.type !== 'end')
    };
    const errors = validateProcessSchema(invalid);
    expect(errors).toContain('Process must have at least one end node');
  });

  it('should detect invalid flow references', () => {
    const invalid = {
      ...expenseReimbursementExample,
      flows: [{ from: 'invalid-id', to: 'step-002', type: 'normal' as const }]
    };
    const errors = validateProcessSchema(invalid);
    expect(errors.some(e => e.includes('references non-existent step'))).toBe(true);
  });

  it('should detect invalid actor reference in step', () => {
    const invalid = {
      ...expenseReimbursementExample,
      steps: [
        { ...expenseReimbursementExample.steps[0], actorId: 'invalid-actor' },
        ...expenseReimbursementExample.steps.slice(1)
      ]
    };
    const errors = validateProcessSchema(invalid);
    expect(errors.some(e => e.includes('references non-existent actor'))).toBe(true);
  });

  it('should detect duplicate step IDs', () => {
    const invalid = {
      ...expenseReimbursementExample,
      steps: [
        ...expenseReimbursementExample.steps,
        { ...expenseReimbursementExample.steps[0] } // Duplicate
      ]
    };
    const errors = validateProcessSchema(invalid);
    expect(errors.some(e => e.includes('Duplicate step ID'))).toBe(true);
  });
});

describe('generateMermaidFromJson', () => {
  it('should generate valid Mermaid syntax from PRD example', () => {
    const result = generateMermaidFromJson(expenseReimbursementExample);

    // Check basic structure
    expect(result).toContain('graph TB');

    // Check subgraphs for each actor
    expect(result).toContain('subgraph emp-001["Employee - All Departments"]');
    expect(result).toContain('subgraph mgr-001["Manager - Management"]');
    expect(result).toContain('subgraph fin-001["Finance Team - Finance"]');

    // Check start/end nodes (circles)
    expect(result).toContain('step-001((Start))');
    expect(result).toContain('step-006((End))');

    // Check decision node (diamond)
    expect(result).toContain('step-003{Review expense report}');

    // Check action nodes (rectangles)
    expect(result).toContain('step-002["Submit expense report with receipts"]');

    // Check flows
    expect(result).toContain('step-001 --> step-002');
    expect(result).toContain('step-003 -->|Approved| step-005');
    expect(result).toContain('step-003 -->|Needs Info| step-004');

    // Check CSS classes
    expect(result).toContain('classDef controlStyle');
    expect(result).toContain('classDef riskStyle');

    // Check control styling applied
    expect(result).toContain(':::controlStyle');

    // Check risk styling applied (can be standalone or combined with controlStyle)
    expect(result).toMatch(/:::(controlStyle:)?riskStyle/);
  });

  it('should handle steps with both controls and risks', () => {
    const result = generateMermaidFromJson(expenseReimbursementExample);

    // step-003 has both controls and risks
    expect(result).toContain('step-003{Review expense report}:::controlStyle:riskStyle');
  });

  it('should throw error for invalid schema', () => {
    const invalid = { processName: 'Test' } as ProcessSchema;
    expect(() => generateMermaidFromJson(invalid)).toThrow('Invalid ProcessSchema');
  });

  it('should escape special characters in labels', () => {
    const schema: ProcessSchema = {
      ...expenseReimbursementExample,
      steps: [
        {
          id: 'step-001',
          type: 'action',
          label: 'Test "quoted" label',
          actorId: 'emp-001',
          controls: [],
          risks: []
        }
      ]
    };

    const result = generateMermaidFromJson(schema);
    expect(result).toContain('#quot;');
  });

  it('should sanitize IDs with special characters', () => {
    const schema: ProcessSchema = {
      ...expenseReimbursementExample,
      actors: [{ id: 'actor@123!', name: 'Test Actor' }],
      steps: [
        {
          id: 'step#001',
          type: 'start',
          label: 'Start',
          actorId: 'actor@123!',
          controls: [],
          risks: []
        }
      ],
      flows: []
    };

    const result = generateMermaidFromJson(schema);
    expect(result).toContain('actor_123_');
    expect(result).toContain('step_001');
  });

  it('should handle process with no flows gracefully', () => {
    const schema: ProcessSchema = {
      ...expenseReimbursementExample,
      flows: []
    };

    const result = generateMermaidFromJson(schema);
    expect(result).toContain('graph TB');
    expect(result).not.toContain('-->');
  });

  it('should handle actor without department', () => {
    const schema: ProcessSchema = {
      ...expenseReimbursementExample,
      actors: [{ id: 'test-actor', name: 'Test Actor' }],
      steps: [
        {
          id: 'step-001',
          type: 'start',
          label: 'Start',
          actorId: 'test-actor',
          controls: [],
          risks: []
        }
      ]
    };

    const result = generateMermaidFromJson(schema);
    expect(result).toContain('subgraph test-actor["Test Actor"]');
  });
});
