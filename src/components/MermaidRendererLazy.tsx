/**
 * Lazy-loaded Mermaid Renderer Wrapper
 * Reduces initial bundle size by loading Mermaid.js only when needed
 */

import { lazy, Suspense } from 'react';
import type { ProcessSchema } from '../types/processSchema';

// Lazy load the actual Mermaid renderer
const MermaidRendererComponent = lazy(() =>
  import('./MermaidRenderer').then(module => ({ default: module.MermaidRenderer }))
);

interface MermaidRendererProps {
  processJson: ProcessSchema | null;
  onNodeClick?: (nodeId: string) => void;
}

// Loading fallback component
function MermaidLoadingFallback() {
  return (
    <div className="w-full h-full bg-white rounded-xl shadow-lg overflow-hidden flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">Loading diagram renderer...</p>
        <p className="text-xs text-gray-400 mt-2">First load may take a moment</p>
      </div>
    </div>
  );
}

/**
 * Lazy-loaded Mermaid Renderer
 * This component wraps the actual renderer in React.lazy() and Suspense
 * to split Mermaid.js into a separate chunk that loads on demand
 */
export function MermaidRendererLazy({ processJson, onNodeClick }: MermaidRendererProps) {
  return (
    <Suspense fallback={<MermaidLoadingFallback />}>
      <MermaidRendererComponent processJson={processJson} onNodeClick={onNodeClick} />
    </Suspense>
  );
}
