import { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DiagramCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onExport?: (format: 'png' | 'pdf') => void;
}

export function DiagramCanvas({ nodes: initialNodes, edges: initialEdges, onExport }: DiagramCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('DiagramCanvas received initialNodes:', initialNodes.length);
    console.log('Nodes:', initialNodes);
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    console.log('DiagramCanvas received initialEdges:', initialEdges.length);
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const handleExport = useCallback(async (format: 'png' | 'pdf') => {
    const flowElement = reactFlowWrapper.current?.querySelector('.react-flow') as HTMLElement;
    if (!flowElement) return;

    const canvas = await html2canvas(flowElement, {
      backgroundColor: '#ffffff',
      scale: 2
    });

    if (format === 'png') {
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `process-flow-${Date.now()}.png`;
      link.href = image;
      link.click();
    } else if (format === 'pdf') {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`process-flow-${Date.now()}.pdf`);
    }

    if (onExport) {
      onExport(format);
    }
  }, [onExport]);

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-lg overflow-hidden relative" ref={reactFlowWrapper}>
      {nodes.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-lg font-medium">No diagram generated yet</p>
            <p className="text-sm mt-2">Enter a process narrative to create a flowchart</p>
          </div>
        </div>
      ) : (
        <>
          <div className="w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              attributionPosition="bottom-right"
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  if (node.id.startsWith('dept-')) return '#334155';
                  if (node.id.startsWith('weakness-')) return '#ef4444';
                  if (node.style?.backgroundColor) return node.style.backgroundColor as string;
                  return '#cbd5e1';
                }}
                maskColor="rgba(0, 0, 0, 0.1)"
              />
            </ReactFlow>
          </div>

          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button
              onClick={() => handleExport('png')}
              className="bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700 p-2 rounded-lg shadow-md transition"
              title="Export as PNG"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700 px-3 py-2 rounded-lg shadow-md transition text-sm font-medium"
              title="Export as PDF"
            >
              PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
