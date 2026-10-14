'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Wrench,
  Sparkles,
  GitCommit,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Compass,
  GraduationCap,
  CalendarCheck,
} from 'lucide-react';

export interface DecisionTraceViewerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  steps: any[];
  defaultOpen?: boolean;
}

export function DecisionTraceViewer({ steps, defaultOpen = false }: DecisionTraceViewerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(null);

  if (!steps || steps.length === 0) return null;

  const totalDuration = steps.reduce(
    (acc, s) => acc + (s.latencyMs || s.durationMs || s.ms || 0),
    0,
  );

  return (
    <div className="mt-3 rounded-xl border border-border/80 bg-muted/30 overflow-hidden shadow-xs transition-all text-xs">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-muted/60 hover:bg-muted/90 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-foreground">
            Multi-Agent Decision Trace (ଏଜେଣ୍ଟ ନିଷ୍ପତ୍ତି ଟ୍ରେସ୍)
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
            {steps.length} Agents Executed
          </span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="flex items-center gap-1 text-[11px]">
            <Clock className="w-3 h-3" />
            {totalDuration}ms
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expandable Trace Timeline */}
      {isOpen && (
        <div className="p-3 border-t border-border/60 divide-y divide-border/40">
          <div className="mb-2 text-[11px] text-muted-foreground flex items-center justify-between flex-wrap gap-1">
            <span>Deterministic LangGraph Orchestrator Execution Log:</span>
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
              8 Agents • Groq Rate-Limited
            </span>
          </div>

          <div className="space-y-2.5 pt-2">
            {steps.map((step, idx) => {
              const isExpanded = expandedStepIndex === idx;
              const agentName = step.agent || step.nodeName || step.node || 'Agent';
              const toolName = step.tool || step.toolName || step.toolUsed;
              const durationMs = step.latencyMs ?? step.durationMs ?? step.ms ?? 0;
              const status = step.status || 'success';
              const fallbackUsed = Boolean(step.fallbackUsed);

              // Agent icon & color styling
              let AgentIcon = Cpu;
              let agentColor = 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';

              if (agentName.includes('intake')) {
                AgentIcon = Compass;
                agentColor = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
              } else if (agentName.includes('concept')) {
                AgentIcon = Sparkles;
                agentColor = 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20';
              } else if (agentName.includes('diagnostician')) {
                AgentIcon = CheckCircle2;
                agentColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
              } else if (agentName.includes('planner')) {
                AgentIcon = GitCommit;
                agentColor = 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20';
              } else if (agentName.includes('tutor')) {
                AgentIcon = GraduationCap;
                agentColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
              } else if (agentName.includes('language')) {
                AgentIcon = ShieldCheck;
                agentColor = 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20';
              } else if (agentName.includes('assessor')) {
                AgentIcon = Wrench;
                agentColor = 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20';
              } else if (agentName.includes('followup')) {
                AgentIcon = CalendarCheck;
                agentColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
              }

              return (
                <div
                  key={step.id || idx}
                  className="rounded-lg border border-border/50 bg-background/70 p-2.5 transition-all hover:border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] w-4 h-4 rounded-full bg-muted flex items-center justify-center font-bold">
                        {step.stepIndex || idx + 1}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border flex items-center gap-1 uppercase tracking-wider ${agentColor}`}>
                        <AgentIcon className="w-3 h-3" />
                        {agentName}
                      </span>
                      {toolName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                          {toolName}
                        </span>
                      )}
                      {fallbackUsed && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-semibold">
                          Fallback Used
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {durationMs}ms
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedStepIndex(isExpanded ? null : idx)}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline font-medium"
                      >
                        {isExpanded ? 'Hide Details' : 'View I/O'}
                      </button>
                    </div>
                  </div>

                  {/* Summary / Reasoning */}
                  <div className="mt-1.5 text-[11px] text-foreground/90 leading-relaxed">
                    {step.inputSummary && (
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Input:</strong> {step.inputSummary}
                      </p>
                    )}
                    {step.outputSummary && (
                      <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                        <strong>Result:</strong> {step.outputSummary}
                      </p>
                    )}
                    {step.reason && (
                      <p className="text-muted-foreground text-[10px] mt-0.5 italic">
                        {step.reason}
                      </p>
                    )}
                    {step.reasoningOdia && (
                      <p className="font-medium text-emerald-900 dark:text-emerald-200">
                        {step.reasoningOdia}
                      </p>
                    )}
                    {step.reasoning && (
                      <p className="text-muted-foreground text-[10.5px] mt-0.5">
                        {step.reasoning}
                      </p>
                    )}
                  </div>

                  {/* Tool Input / Output Inspector */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                      {(step.input || step.toolInput) && (
                        <div className="p-2 rounded bg-muted/60 overflow-x-auto max-h-48">
                          <span className="text-muted-foreground font-semibold block mb-1">
                            Input Payload:
                          </span>
                          <pre>{JSON.stringify(step.input || step.toolInput, null, 2)}</pre>
                        </div>
                      )}
                      {(step.output || step.toolOutput) && (
                        <div className="p-2 rounded bg-muted/60 overflow-x-auto max-h-48">
                          <span className="text-muted-foreground font-semibold block mb-1">
                            Output Payload:
                          </span>
                          <pre>{JSON.stringify(step.output || step.toolOutput, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
