/**
 * Mermaid Diagram Generator
 * Converts ProcessSchema to Mermaid.js syntax
 * Based on PRD Section 3.2
 */

import type { ProcessSchema, ProcessStep, Actor } from '../types/processSchema';

interface MermaidConfig {
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  themeVariables?: Record<string, string>;
}

/**
 * Main entry point: Generate complete Mermaid diagram syntax
 */
export function generateMermaidFromJson(
  json: ProcessSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config?: MermaidConfig
): string {
  if (!json || !json.actors || !json.steps) {
    throw new Error('Invalid ProcessSchema: missing required fields');
  }

  const lines: string[] = [];

  // Start graph definition
  lines.push('graph TB');
  lines.push('');

  // Build actor swimlanes with their steps
  const swimlanes = buildSwimlanes(json);
  lines.push(...swimlanes);
  lines.push('');

  // Build flow connections
  const flows = buildFlows(json);
  lines.push(...flows);
  lines.push('');

  // Add styling classes for controls and risks
  const styles = buildStyles();
  lines.push(...styles);

  return lines.join('\n');
}

/**
 * Build swimlane subgraphs grouped by actor
 * PRD Section 3.2: "One subgraph per actor"
 */
function buildSwimlanes(json: ProcessSchema): string[] {
  const lines: string[] = [];

  // Group steps by actor
  const stepsByActor = new Map<string, ProcessStep[]>();
  json.steps.forEach(step => {
    if (!stepsByActor.has(step.actorId)) {
      stepsByActor.set(step.actorId, []);
    }
    stepsByActor.get(step.actorId)!.push(step);
  });

  // Sort actors by first appearance in flow
  const actorOrder = getActorOrderByFlow(json);

  // Generate subgraph for each actor
  actorOrder.forEach(actor => {
    const steps = stepsByActor.get(actor.id) || [];
    if (steps.length === 0) return;

    // Subgraph header with actor name and department
    const swimlaneLabel = actor.department
      ? `${actor.name} - ${actor.department}`
      : actor.name;

    lines.push(`    subgraph ${sanitizeId(actor.id)}["${swimlaneLabel}"]`);

    // Add all steps for this actor
    steps.forEach(step => {
      const nodeDefinition = buildNodeDefinition(step, json);
      lines.push(`        ${nodeDefinition}`);
    });

    lines.push('    end');
    lines.push('');
  });

  return lines;
}

/**
 * Build individual node definition based on step type
 * PRD Section 3.2 Shape Mapping:
 * - action → Rectangle [text]
 * - decision → Diamond {text}
 * - start → Circle ((Start))
 * - end → Circle ((End))
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildNodeDefinition(step: ProcessStep, _json: ProcessSchema): string {
  const nodeId = sanitizeId(step.id);
  const label = escapeLabel(step.label);

  // Determine shape based on type
  let shape: string;
  switch (step.type) {
    case 'start':
      shape = `${nodeId}((${label}))`;
      break;
    case 'end':
      shape = `${nodeId}((${label}))`;
      break;
    case 'decision':
      shape = `${nodeId}{${label}}`;
      break;
    case 'action':
    default:
      shape = `${nodeId}["${label}"]`;
      break;
  }

  // Add CSS classes for controls and risks
  const cssClasses: string[] = [];

  if (step.controls && step.controls.length > 0) {
    cssClasses.push('controlStyle');
  }

  if (step.risks && step.risks.length > 0) {
    cssClasses.push('riskStyle');
  }

  // Apply classes if any
  if (cssClasses.length > 0) {
    shape += `:::${cssClasses.join(':')}`;
  }

  return shape;
}

/**
 * Build flow connections between steps
 * Uses explicit flows array from JSON
 */
function buildFlows(json: ProcessSchema): string[] {
  const lines: string[] = [];

  if (!json.flows || json.flows.length === 0) {
    // Fallback: no explicit flows defined
    return lines;
  }

  json.flows.forEach(flow => {
    const fromId = sanitizeId(flow.from);
    const toId = sanitizeId(flow.to);

    if (flow.label) {
      // Conditional flow with label (decision branch)
      const label = escapeLabel(flow.label);
      lines.push(`    ${fromId} -->|${label}| ${toId}`);
    } else {
      // Normal flow
      lines.push(`    ${fromId} --> ${toId}`);
    }
  });

  return lines;
}

/**
 * Build CSS style definitions
 * PRD Section 3.2:
 * - controlStyle: Blue background, blue stroke
 * - riskStyle: Orange background, orange stroke
 */
function buildStyles(): string[] {
  return [
    '    classDef controlStyle fill:#E3F2FD,stroke:#1976D2,stroke-width:2px',
    '    classDef riskStyle fill:#FFF3E0,stroke:#F57C00,stroke-width:2px'
  ];
}

/**
 * Determine actor order by first appearance in process flow
 * PRD Section 3.3: "Actors sorted by first appearance in process flow"
 */
function getActorOrderByFlow(json: ProcessSchema): Actor[] {
  const actorOrder: Actor[] = [];
  const seenActors = new Set<string>();

  // Start with start node, then follow flows
  const startStep = json.steps.find(s => s.type === 'start');
  if (startStep) {
    const startActor = json.actors.find(a => a.id === startStep.actorId);
    if (startActor) {
      actorOrder.push(startActor);
      seenActors.add(startActor.id);
    }
  }

  // Follow flow order to determine actor sequence
  const flowGraph = buildFlowGraph(json.flows);
  const visitedSteps = new Set<string>();

  function traverseFlows(stepId: string) {
    if (visitedSteps.has(stepId)) return;
    visitedSteps.add(stepId);

    const step = json.steps.find(s => s.id === stepId);
    if (step && !seenActors.has(step.actorId)) {
      const actor = json.actors.find(a => a.id === step.actorId);
      if (actor) {
        actorOrder.push(actor);
        seenActors.add(actor.id);
      }
    }

    // Continue traversing
    const nextSteps = flowGraph.get(stepId) || [];
    nextSteps.forEach(traverseFlows);
  }

  if (startStep) {
    traverseFlows(startStep.id);
  }

  // Add any remaining actors not in flow
  json.actors.forEach(actor => {
    if (!seenActors.has(actor.id)) {
      actorOrder.push(actor);
    }
  });

  return actorOrder;
}

/**
 * Build a flow graph for traversal (adjacency list)
 */
function buildFlowGraph(flows: ProcessSchema['flows']): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  flows.forEach(flow => {
    if (!graph.has(flow.from)) {
      graph.set(flow.from, []);
    }
    graph.get(flow.from)!.push(flow.to);
  });

  return graph;
}

/**
 * Sanitize IDs for Mermaid (alphanumeric + dash/underscore only)
 * Also handles reserved Mermaid keywords to prevent syntax conflicts
 */
function sanitizeId(id: string): string {
  // Replace special characters with underscores
  let sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Prefix reserved Mermaid keywords to avoid syntax conflicts
  // These words have special meaning in Mermaid syntax and cannot be used as node IDs
  const RESERVED_KEYWORDS = [
    'start', 'end',           // Conflict with subgraph closers and flow keywords
    'subgraph', 'graph',      // Graph structure keywords
    'flowchart', 'direction', // Flowchart keywords
    'class', 'style',         // Styling keywords
    'click', 'call'           // Interaction keywords
  ];

  if (RESERVED_KEYWORDS.includes(sanitized.toLowerCase())) {
    sanitized = `node_${sanitized}`;
  }

  return sanitized;
}

/**
 * Escape special characters in labels
 */
function escapeLabel(label: string): string {
  // Mermaid requires quotes for labels with special chars
  // Already handled by using ["label"] syntax
  // Just escape quotes within the label
  return label.replace(/"/g, '#quot;').replace(/\n/g, '<br/>');
}

/**
 * Validate ProcessSchema before generation
 * Returns validation errors if any
 */
export function validateProcessSchema(json: ProcessSchema): string[] {
  const errors: string[] = [];

  // Check required fields
  if (!json.processName) errors.push('processName is required');
  if (!json.processId) errors.push('processId is required');
  if (!Array.isArray(json.actors)) errors.push('actors must be an array');
  if (!Array.isArray(json.steps)) errors.push('steps must be an array');
  if (!Array.isArray(json.flows)) errors.push('flows must be an array');

  // Validate actors
  json.actors?.forEach((actor, idx) => {
    if (!actor.id) errors.push(`actors[${idx}].id is required`);
    if (!actor.name) errors.push(`actors[${idx}].name is required`);
  });

  // Validate steps
  const stepIds = new Set<string>();
  const actorIds = new Set(json.actors?.map(a => a.id) || []);

  json.steps?.forEach((step, idx) => {
    if (!step.id) errors.push(`steps[${idx}].id is required`);
    if (stepIds.has(step.id)) errors.push(`Duplicate step ID: ${step.id}`);
    stepIds.add(step.id);

    if (!step.type || !['action', 'decision', 'start', 'end'].includes(step.type)) {
      errors.push(`steps[${idx}].type must be action|decision|start|end`);
    }
    if (!step.label) errors.push(`steps[${idx}].label is required`);
    if (!step.actorId) errors.push(`steps[${idx}].actorId is required`);
    if (step.actorId && !actorIds.has(step.actorId)) {
      errors.push(`steps[${idx}].actorId "${step.actorId}" references non-existent actor`);
    }
  });

  // Validate flows reference valid steps
  json.flows?.forEach((flow, idx) => {
    if (!flow.from) errors.push(`flows[${idx}].from is required`);
    if (!flow.to) errors.push(`flows[${idx}].to is required`);
    if (flow.from && !stepIds.has(flow.from)) {
      errors.push(`flows[${idx}].from "${flow.from}" references non-existent step`);
    }
    if (flow.to && !stepIds.has(flow.to)) {
      errors.push(`flows[${idx}].to "${flow.to}" references non-existent step`);
    }
  });

  // Validate exactly one start node
  const startNodes = json.steps?.filter(s => s.type === 'start') || [];
  if (startNodes.length === 0) {
    errors.push('Process must have exactly one start node');
  } else if (startNodes.length > 1) {
    errors.push('Process must have exactly one start node (found multiple)');
  }

  // Validate at least one end node
  const endNodes = json.steps?.filter(s => s.type === 'end') || [];
  if (endNodes.length === 0) {
    errors.push('Process must have at least one end node');
  }

  return errors;
}
