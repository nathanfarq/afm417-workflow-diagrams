/**
 * Controls and Risks Summary Component
 * Displays a collapsible summary of all controls and risks from the process JSON
 * Shows associations with process steps for quick reference
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, AlertTriangle } from 'lucide-react';
import type { ProcessSchema, Control, Risk } from '../types/processSchema';

interface ControlsRisksSummaryProps {
  processJson: ProcessSchema | null;
}

export default function ControlsRisksSummary({ processJson }: ControlsRisksSummaryProps) {
  const [showControls, setShowControls] = useState(true);
  const [showRisks, setShowRisks] = useState(true);

  // Don't render if no process data
  if (!processJson || (!processJson.controls.length && !processJson.risks.length)) {
    return null;
  }

  // Helper to get step labels for a given control or risk ID
  const getAssociatedSteps = (id: string, type: 'control' | 'risk'): string[] => {
    return processJson.steps
      .filter(step => {
        if (type === 'control') {
          return step.controls.includes(id);
        } else {
          return step.risks.includes(id);
        }
      })
      .map(step => step.label);
  };

  // Badge styling for control types
  const getControlTypeBadge = (type: Control['type']) => {
    const styles = {
      preventive: 'bg-blue-100 text-blue-800 border-blue-300',
      detective: 'bg-purple-100 text-purple-800 border-purple-300',
      corrective: 'bg-green-100 text-green-800 border-green-300'
    };
    return styles[type];
  };

  // Badge styling for risk severity
  const getRiskSeverityBadge = (severity: Risk['severity']) => {
    const styles = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-red-100 text-red-800 border-red-300'
    };
    return styles[severity];
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      {/* Controls Section */}
      {processJson.controls.length > 0 && (
        <div className="border-b border-gray-200">
          <button
            onClick={() => setShowControls(!showControls)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">
                Controls
              </span>
              <span className="text-sm text-gray-500">
                ({processJson.controls.length})
              </span>
            </div>
            {showControls ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {showControls && (
            <div className="px-6 pb-6 space-y-4">
              {processJson.controls.map((control) => {
                const associatedSteps = getAssociatedSteps(control.id, 'control');
                return (
                  <div
                    key={control.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded border ${getControlTypeBadge(
                              control.type
                            )}`}
                          >
                            {control.type.charAt(0).toUpperCase() + control.type.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {control.description}
                        </p>
                        {control.detailedDescription !== control.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {control.detailedDescription}
                          </p>
                        )}
                        {associatedSteps.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">
                              Associated Steps:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {associatedSteps.map((stepLabel, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 text-xs bg-white border border-gray-300 rounded text-gray-700"
                                >
                                  {stepLabel}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Risks Section */}
      {processJson.risks.length > 0 && (
        <div>
          <button
            onClick={() => setShowRisks(!showRisks)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="text-lg font-semibold text-gray-900">
                Risks
              </span>
              <span className="text-sm text-gray-500">
                ({processJson.risks.length})
              </span>
            </div>
            {showRisks ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {showRisks && (
            <div className="px-6 pb-6 space-y-4">
              {processJson.risks.map((risk) => {
                const associatedSteps = getAssociatedSteps(risk.id, 'risk');
                return (
                  <div
                    key={risk.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded border ${getRiskSeverityBadge(
                              risk.severity
                            )}`}
                          >
                            {risk.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {risk.description}
                        </p>
                        {risk.detailedDescription !== risk.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {risk.detailedDescription}
                          </p>
                        )}
                        {associatedSteps.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">
                              Associated Steps:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {associatedSteps.map((stepLabel, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 text-xs bg-white border border-gray-300 rounded text-gray-700"
                                >
                                  {stepLabel}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
