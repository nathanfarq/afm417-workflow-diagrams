/**
 * Mermaid Diagram Renderer Component
 * Renders Mermaid diagrams with pan/zoom and export capabilities
 * Based on PRD Section 3.4 and 6.3
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { Download, ZoomIn, ZoomOut } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { ProcessSchema } from '../types/processSchema';
import { generateMermaidFromJson, validateProcessSchema } from '../utils/mermaidGenerator';

interface MermaidRendererProps {
  processJson: ProcessSchema | null;
  onNodeClick?: (nodeId: string) => void;
}

// Initialize Mermaid with configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  }
});

export function MermaidRenderer({ processJson, onNodeClick }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mermaidCode, setMermaidCode] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isRendering, setIsRendering] = useState(false);

  // Generate Mermaid code from JSON
  useEffect(() => {
    if (!processJson) {
      setMermaidCode('');
      setRenderError(null);
      return;
    }

    try {
      // Validate schema first
      const validationErrors = validateProcessSchema(processJson);
      if (validationErrors.length > 0) {
        setRenderError(`Schema validation errors:\n${validationErrors.join('\n')}`);
        return;
      }

      // Generate Mermaid syntax
      const code = generateMermaidFromJson(processJson);
      setMermaidCode(code);
      setRenderError(null);
    } catch (error) {
      console.error('Error generating Mermaid code:', error);
      setRenderError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [processJson]);

  // Render Mermaid diagram
  useEffect(() => {
    if (!mermaidCode || !containerRef.current) return;

    const renderDiagram = async () => {
      setIsRendering(true);
      try {
        // Clear previous diagram
        const container = containerRef.current;
        if (!container) return;

        container.innerHTML = '';

        // Generate unique ID for this render
        const id = `mermaid-${Date.now()}`;

        // Render with Mermaid
        const { svg } = await mermaid.render(id, mermaidCode);

        // Insert SVG
        container.innerHTML = svg;

        // Add click handlers if provided
        if (onNodeClick) {
          const nodes = container.querySelectorAll('[id^="flowchart-"]');
          nodes.forEach(node => {
            node.addEventListener('click', () => {
              const nodeId = node.id.replace('flowchart-', '').replace(/-.*/, '');
              onNodeClick(nodeId);
            });
          });
        }

        setRenderError(null);
      } catch (error) {
        console.error('Mermaid render error:', error);
        setRenderError(error instanceof Error ? error.message : 'Rendering failed');
      } finally {
        setIsRendering(false);
      }
    };

    renderDiagram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mermaidCode]);

  // Export handlers
  const handleExportSVG = useCallback(() => {
    if (!containerRef.current) return;

    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${processJson?.processName || 'diagram'}-${Date.now()}.svg`;
    link.click();

    URL.revokeObjectURL(url);
  }, [processJson]);

  const handleExportPNG = useCallback(async () => {
    if (!containerRef.current) return;

    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    try {
      const canvas = await html2canvas(svgElement as unknown as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${processJson?.processName || 'diagram'}-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('PNG export error:', error);
      alert('Failed to export PNG');
    }
  }, [processJson]);

  const handleExportPDF = useCallback(async () => {
    if (!containerRef.current) return;

    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    try {
      const canvas = await html2canvas(svgElement as unknown as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${processJson?.processName || 'diagram'}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF');
    }
  }, [processJson]);

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  // Empty state
  if (!processJson) {
    return (
      <div className="w-full h-full bg-white rounded-xl shadow-lg overflow-hidden flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-lg font-medium">No process diagram yet</p>
          <p className="text-sm mt-2">Start a conversation to build your process flow</p>
        </div>
      </div>
    );
  }

  // Error state
  if (renderError) {
    return (
      <div className="w-full h-full bg-white rounded-xl shadow-lg overflow-hidden flex items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          <div className="text-6xl mb-4 text-red-500">⚠️</div>
          <p className="text-lg font-semibold text-red-600 mb-2">Diagram Rendering Error</p>
          <pre className="text-sm text-left bg-red-50 p-4 rounded border border-red-200 overflow-auto max-h-64">
            {renderError}
          </pre>
          <p className="text-sm text-gray-600 mt-4">
            Please check the process definition or contact support if the error persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-lg overflow-hidden relative flex flex-col">
      {/* Toolbar */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        {/* Zoom controls */}
        <div className="bg-white border-2 border-gray-300 rounded-lg shadow-md flex">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-50 border-r border-gray-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-3 py-2 hover:bg-gray-50 border-r border-gray-300 text-xs font-medium text-gray-700"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-50"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Export controls */}
        <div className="bg-white border-2 border-gray-300 rounded-lg shadow-md flex">
          <button
            onClick={handleExportSVG}
            className="px-3 py-2 hover:bg-gray-50 border-r border-gray-300 text-xs font-medium text-gray-700"
            title="Export as SVG"
          >
            SVG
          </button>
          <button
            onClick={handleExportPNG}
            className="px-3 py-2 hover:bg-gray-50 border-r border-gray-300 text-xs font-medium text-gray-700"
            title="Export as PNG"
          >
            PNG
          </button>
          <button
            onClick={handleExportPDF}
            className="p-2 hover:bg-gray-50"
            title="Export as PDF"
          >
            <Download className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Diagram container - Scrollable independently */}
      <div className="w-full h-full overflow-auto p-8 min-h-0">
        <div
          ref={containerRef}
          className="mermaid-container transition-transform"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            minHeight: '100%'
          }}
        />
      </div>

      {/* Loading overlay */}
      {isRendering && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Rendering diagram...</p>
          </div>
        </div>
      )}
    </div>
  );
}
