import type { Node, Edge } from 'reactflow';
import type { AuditProcessJSON } from '../types/auditProcess';

const STEP_WIDTH = 250;
const STEP_HEIGHT = 100;
const HORIZONTAL_GAP = 300;
const VERTICAL_GAP = 150;

export function convertJSONToDiagram(json: AuditProcessJSON): {
  nodes: Node[];
  edges: Edge[];
  swimlanes: Array<{ id: string; name: string; y: number; height: number; color: string }>;
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const departmentYPositions = new Map<string, number>();
  json.departments.forEach((dept, index) => {
    departmentYPositions.set(dept.id, index * (STEP_HEIGHT + VERTICAL_GAP));
  });

  const swimlanes = json.departments.map((dept, index) => ({
    id: dept.id,
    name: dept.name,
    y: index * (STEP_HEIGHT + VERTICAL_GAP),
    height: STEP_HEIGHT + VERTICAL_GAP,
    color: dept.color || getDefaultColor(index),
  }));

  const stepsByDept = new Map<string, typeof json.steps>();
  json.steps.forEach((step) => {
    if (!stepsByDept.has(step.departmentId)) {
      stepsByDept.set(step.departmentId, []);
    }
    stepsByDept.get(step.departmentId)!.push(step);
  });

  json.steps.forEach((step) => {
    const deptSteps = stepsByDept.get(step.departmentId) || [];
    const indexInDept = deptSteps.findIndex((s) => s.id === step.id);
    const yPos = departmentYPositions.get(step.departmentId) || 0;
    const xPos = indexInDept * HORIZONTAL_GAP;

    const stepLabel = `${step.name}${step.description ? '\n' + step.description : ''}${step.responsible ? '\n👤 ' + step.responsible : ''}`;

    nodes.push({
      id: step.id,
      type: 'default',
      position: { x: xPos, y: yPos },
      data: {
        label: stepLabel,
      },
      style: {
        width: STEP_WIDTH,
        minHeight: STEP_HEIGHT,
        padding: '12px',
        background: '#ffffff',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        whiteSpace: 'pre-wrap',
        textAlign: 'center',
      },
    });

    const deptStepsSorted = [...deptSteps].sort((a, b) => a.order - b.order);
    const currentIndex = deptStepsSorted.findIndex((s) => s.id === step.id);
    if (currentIndex < deptStepsSorted.length - 1) {
      const nextStep = deptStepsSorted[currentIndex + 1];
      edges.push({
        id: `${step.id}-${nextStep.id}`,
        source: step.id,
        target: nextStep.id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
      });
    }
  });

  json.controls.forEach((control) => {
    const relatedStep = json.steps.find((s) => s.id === control.relatedStepId);
    if (!relatedStep) return;

    const stepNode = nodes.find((n) => n.id === relatedStep.id);
    if (!stepNode) return;

    const controlColor =
      control.type === 'preventive'
        ? '#10b981'
        : control.type === 'detective'
        ? '#f59e0b'
        : '#8b5cf6';

    nodes.push({
      id: control.id,
      type: 'default',
      position: {
        x: stepNode.position.x + STEP_WIDTH + 50,
        y: stepNode.position.y - 20,
      },
      data: {
        label: `${control.name}\n${control.type}`,
      },
      style: {
        width: 150,
        padding: '8px',
        background: controlColor,
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '11px',
        whiteSpace: 'pre-wrap',
        textAlign: 'center',
      },
    });

    edges.push({
      id: `${relatedStep.id}-${control.id}`,
      source: relatedStep.id,
      target: control.id,
      type: 'smoothstep',
      style: { stroke: controlColor, strokeWidth: 1.5, strokeDasharray: '5,5' },
    });
  });

  json.weaknesses.forEach((weakness) => {
    const relatedStep = json.steps.find((s) => s.id === weakness.relatedStepId);
    if (!relatedStep) return;

    const stepNode = nodes.find((n) => n.id === relatedStep.id);
    if (!stepNode) return;

    const severityColor =
      weakness.severity === 'critical'
        ? '#dc2626'
        : weakness.severity === 'high'
        ? '#ea580c'
        : weakness.severity === 'medium'
        ? '#f59e0b'
        : '#84cc16';

    nodes.push({
      id: weakness.id,
      type: 'default',
      position: {
        x: stepNode.position.x + STEP_WIDTH + 50,
        y: stepNode.position.y + 40,
      },
      data: {
        label: `⚠️ ${weakness.severity.toUpperCase()}\n${weakness.description}`,
      },
      style: {
        width: 150,
        padding: '8px',
        background: severityColor,
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '11px',
        whiteSpace: 'pre-wrap',
        textAlign: 'center',
      },
    });

    edges.push({
      id: `${relatedStep.id}-${weakness.id}`,
      source: relatedStep.id,
      target: weakness.id,
      type: 'smoothstep',
      style: { stroke: severityColor, strokeWidth: 1.5, strokeDasharray: '5,5' },
    });
  });

  return { nodes, edges, swimlanes };
}

function getDefaultColor(index: number): string {
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#14b8a6',
    '#f97316',
  ];
  return colors[index % colors.length];
}
