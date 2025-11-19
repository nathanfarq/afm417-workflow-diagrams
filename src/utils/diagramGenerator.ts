import { Node, Edge, MarkerType } from 'reactflow';
import { ProcessStep } from './narrativeParser';

export interface DiagramData {
  nodes: Node[];
  edges: Edge[];
}

const SWIMLANE_WIDTH = 300;
const NODE_SPACING_Y = 180;
const NODE_SPACING_X = 350;

export function generateDiagram(steps: ProcessStep[], departments: string[]): DiagramData {
  console.log('generateDiagram called with:', { stepsCount: steps.length, departments });

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const departmentMap = new Map<string, number>();
  departments.forEach((dept, index) => {
    departmentMap.set(dept, index);

    nodes.push({
      id: `dept-${index}`,
      data: { label: dept },
      position: { x: index * NODE_SPACING_X, y: 0 },
      style: {
        width: SWIMLANE_WIDTH,
        height: 80,
        backgroundColor: '#334155',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '18px',
        fontWeight: 'bold',
        padding: '20px',
        textAlign: 'center'
      },
      draggable: false
    });
    console.log(`Added department node: dept-${index} - ${dept}`);
  });

  const currentY = 120;
  const departmentCounters = new Map<string, number>();

  steps.forEach((step, index) => {
    const deptIndex = departmentMap.get(step.department) || 0;
    const deptStepCount = departmentCounters.get(step.department) || 0;
    departmentCounters.set(step.department, deptStepCount + 1);

    const x = deptIndex * NODE_SPACING_X + (SWIMLANE_WIDTH / 2) - 75;
    const y = currentY + (deptStepCount * NODE_SPACING_Y);

    let nodeStyle: React.CSSProperties = {
      width: 150,
      height: 80,
      backgroundColor: 'white',
      border: '2px solid #cbd5e1',
      borderRadius: '8px',
      fontSize: '12px',
      padding: '12px',
      textAlign: 'center'
    };

    if (step.type === 'start' || step.type === 'end') {
      nodeStyle = {
        ...nodeStyle,
        borderRadius: '50%',
        width: 100,
        height: 100,
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        fontWeight: 'bold'
      };
    } else if (step.type === 'decision') {
      nodeStyle = {
        ...nodeStyle,
        backgroundColor: '#fbbf24',
        borderColor: '#f59e0b',
        borderWidth: '2px',
        width: 120,
        height: 120
      };
    } else if (step.type === 'control' || step.isControl) {
      nodeStyle = {
        ...nodeStyle,
        backgroundColor: '#3b82f6',
        color: 'white',
        border: '3px solid #1e40af',
        boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
      };
    }

    const label = step.text.length > 60 ? step.text.substring(0, 57) + '...' : step.text;

    console.log(`Adding node ${step.id} at position (${x}, ${y})`);

    nodes.push({
      id: step.id,
      data: {
        label: step.type === 'decision' ? `Decision: ${label}` : label
      },
      position: { x, y },
      style: nodeStyle
    });

    if (index > 0) {
      const prevStep = steps[index - 1];

      edges.push({
        id: `edge-${prevStep.id}-${step.id}`,
        source: prevStep.id,
        target: step.id,
        type: 'smoothstep',
        animated: step.isControl,
        style: {
          stroke: step.isControl ? '#3b82f6' : '#64748b',
          strokeWidth: step.isControl ? 3 : 2
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: step.isControl ? '#3b82f6' : '#64748b'
        }
      });
    }
  });

  return { nodes, edges };
}

export function addWeaknessIndicators(
  diagramData: DiagramData,
  weaknesses: Array<{ id: string; stepId: string; severity: string }>
): DiagramData {
  const nodes = [...diagramData.nodes];

  weaknesses.forEach((weakness) => {
    const stepNode = nodes.find(n => n.id === weakness.stepId);
    if (stepNode) {
      const iconColor = weakness.severity === 'high' ? '#ef4444' :
                       weakness.severity === 'medium' ? '#f59e0b' : '#eab308';

      nodes.push({
        id: `weakness-${weakness.id}`,
        data: { label: '⚠️' },
        position: {
          x: stepNode.position.x + 160,
          y: stepNode.position.y - 10
        },
        style: {
          width: 40,
          height: 40,
          backgroundColor: iconColor,
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          fontSize: '20px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 1000
        },
        draggable: false
      });
    }
  });

  return { nodes, edges: diagramData.edges };
}
