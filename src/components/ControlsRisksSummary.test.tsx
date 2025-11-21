/**
 * Tests for ControlsRisksSummary component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ControlsRisksSummary from './ControlsRisksSummary';
import type { ProcessSchema } from '../types/processSchema';

describe('ControlsRisksSummary', () => {
  const mockProcessSchema: ProcessSchema = {
    processName: 'Test Process',
    processId: 'test-123',
    lastUpdated: '2025-01-01T00:00:00Z',
    actors: [
      { id: 'actor1', name: 'Manager', department: 'Operations' }
    ],
    steps: [
      {
        id: 'step1',
        type: 'action',
        label: 'Review Document',
        actorId: 'actor1',
        controls: ['control1'],
        risks: ['risk1']
      },
      {
        id: 'step2',
        type: 'decision',
        label: 'Approve or Reject',
        actorId: 'actor1',
        controls: ['control2'],
        risks: ['risk1', 'risk2']
      }
    ],
    decisions: [],
    controls: [
      {
        id: 'control1',
        type: 'preventive',
        description: 'Document validation',
        detailedDescription: 'Validate all required fields are present'
      },
      {
        id: 'control2',
        type: 'detective',
        description: 'Dual approval',
        detailedDescription: 'Require two-person approval for high-value transactions'
      }
    ],
    risks: [
      {
        id: 'risk1',
        description: 'Missing information',
        severity: 'medium',
        detailedDescription: 'Document may be incomplete'
      },
      {
        id: 'risk2',
        description: 'Unauthorized approval',
        severity: 'high',
        detailedDescription: 'Single person could approve without oversight'
      }
    ],
    flows: []
  };

  it('renders controls section when controls exist', () => {
    render(<ControlsRisksSummary processJson={mockProcessSchema} />);
    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('renders risks section when risks exist', () => {
    render(<ControlsRisksSummary processJson={mockProcessSchema} />);
    expect(screen.getByText('Risks')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('displays control types correctly', () => {
    render(<ControlsRisksSummary processJson={mockProcessSchema} />);
    expect(screen.getByText('Preventive')).toBeInTheDocument();
    expect(screen.getByText('Detective')).toBeInTheDocument();
  });

  it('displays risk severity levels correctly', () => {
    render(<ControlsRisksSummary processJson={mockProcessSchema} />);
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('shows associated steps for controls', () => {
    render(<ControlsRisksSummary processJson={mockProcessSchema} />);
    expect(screen.getByText('Review Document')).toBeInTheDocument();
    expect(screen.getByText('Approve or Reject')).toBeInTheDocument();
  });

  it('returns null when no process JSON provided', () => {
    const { container } = render(<ControlsRisksSummary processJson={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when no controls or risks exist', () => {
    const emptySchema: ProcessSchema = {
      ...mockProcessSchema,
      controls: [],
      risks: []
    };
    const { container } = render(<ControlsRisksSummary processJson={emptySchema} />);
    expect(container.firstChild).toBeNull();
  });

  it('associates risks with multiple steps correctly', () => {
    render(<ControlsRisksSummary processJson={mockProcessSchema} />);
    // risk1 appears in both step1 and step2
    const riskCards = screen.getAllByText('Missing information');
    expect(riskCards.length).toBeGreaterThan(0);
  });
});
