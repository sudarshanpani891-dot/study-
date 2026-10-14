'use client';

import { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Presentation,
  User,
  Bot,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AgentContribution } from '@/app/api/portal/chat/route';

export interface PortalChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  topicDetected?: string;
  languageDetected?: string;
  agentContributions?: AgentContribution[];
}

interface PortalConversationFeedProps {
  messages: PortalChatMessage[];
  loading: boolean;
  onDraftClassroom: (topic: string) => void;
  onSelectSuggestion?: (prompt: string) => void;
  onClearChat?: () => void;
}

export function PortalConversationFeed({
  messages,
  loading,
  onDraftClassroom,
  onSelectSuggestion,
  onClearChat,
}: PortalConversationFeedProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>({});

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleAgentExpand = (msgId: string) => {
    setExpandedAgents((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === undefined ? false : !prev[msgId],
    }));
  };

  if (messages.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pt-4 pb-8">
      {/* Thread Header Controls */}
      <div className="flex items-center justify-between px-2 text-xs text-muted-foreground border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-foreground">Multi-Agent Interactive Dialogue</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
            ChatGPT Mode
          </span>
        </div>
        {onClearChat && (
          <button
            type="button"
            onClick={onClearChat}
            className="flex items-center gap-1 text-[11px] hover:text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>New Chat</span>
          </button>
        )}
      </div>

      {/* Message List */}
      <div className="space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-3">
            {msg.sender === 'user' ? (
              /* User Query Bubble */
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4 shadow-md">
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <span className="text-[10px] text-white/60 block text-right mt-1.5 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ) : (
              /* Assistant & Multi-Agent Response */
              <div className="flex justify-start">
                <div className="w-full rounded-2xl rounded-tl-xs bg-white/90 dark:bg-slate-900/90 border border-border/80 p-5 shadow-lg space-y-4">
                  {/* Header: Lead Teacher & Badges */}
                  <div className="flex items-center justify-between border-b border-border/50 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full overflow-hidden ring-2 ring-blue-500/30 shrink-0">
                        <img
                          src="/avatars/teacher.png"
                          alt="AI Teacher"
                          className="size-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-foreground">AI Teacher</h4>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                            Lead Instructor
                          </span>
                          {msg.languageDetected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                              {msg.languageDetected}
                            </span>
                          )}
                        </div>
                        {msg.topicDetected && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-md">
                            Topic: <span className="font-semibold text-foreground/80">{msg.topicDetected}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Dedicated Action Button: Draft Classroom from this topic! */}
                    <Button
                      size="sm"
                      onClick={() => onDraftClassroom(msg.topicDetected || msg.content)}
                      className="h-8 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      <Presentation className="w-3.5 h-3.5" />
                      <span>🎓 Draft Full Classroom</span>
                    </Button>
                  </div>

                  {/* Core Teacher Response Content */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 font-normal space-y-2">
                    {msg.content}
                  </div>

                  {/* Message Bottom Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {msg.agentContributions && msg.agentContributions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleAgentExpand(msg.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-primary hover:bg-primary/10 font-semibold transition-colors"
                      >
                        <span>
                          👥 {msg.agentContributions.length} Agent Insights
                        </span>
                        {expandedAgents[msg.id] === false ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* ── Multi-Agent Collaborative Cards ── */}
                  {msg.agentContributions &&
                    msg.agentContributions.length > 0 &&
                    expandedAgents[msg.id] !== false && (
                      <div className="pt-3 border-t border-border/60 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Multi-Agent Ensemble Collaboration:</span>
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Collaborative Roundtable
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {msg.agentContributions.map((contrib, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border p-3 bg-muted/30 transition-all hover:bg-muted/50 text-xs space-y-1.5"
                              style={{ borderLeftColor: contrib.color, borderLeftWidth: '3px' }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="size-6 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
                                  <img
                                    src={contrib.avatar}
                                    alt={contrib.agentName}
                                    className="size-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-foreground truncate">
                                      {contrib.agentName}
                                    </span>
                                    <span
                                      className="text-[9px] px-1 py-0.2 rounded font-semibold uppercase"
                                      style={{ backgroundColor: `${contrib.color}20`, color: contrib.color }}
                                    >
                                      {contrib.role}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground truncate font-medium">
                                    {contrib.title}
                                  </p>
                                </div>
                              </div>

                              <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[11px] pl-1 font-medium">
                                {contrib.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-xs bg-white/90 dark:bg-slate-900/90 border border-border/80 p-4 shadow-sm flex items-center gap-3 text-xs text-muted-foreground">
              <div className="relative flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-600 animate-spin" />
              </div>
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">AI Teacher & Student Agents are collaborating...</p>
                <p className="text-[11px] text-muted-foreground">
                  Synthesizing core explanation, cheat sheet notes, and analogies
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
