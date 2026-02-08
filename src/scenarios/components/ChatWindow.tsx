// components/voice-chat-window.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatScenarioType } from "@/src/scenarios/types";
import type { KeepItGoingContext } from "@/src/scenarios/keepitgoing/types";

interface ChatMessage {
  id: string;
  sender: "user" | "ai" | "coach";
  text: string;
  archetype?: string; // Shows which archetype is responding
  isIntroduction?: boolean;
  coachLevel?: "small" | "milestone";
}

interface SmallEvaluation {
  score: number;
  feedback: string;
}

interface MilestoneEvaluation extends SmallEvaluation {
  strengths: string[];
  improvements: string[];
  suggestedNextLine?: string;
  turn?: number;
}

interface VoiceChatWindowProps {
  onClose: () => void;
  scenarioType: ChatScenarioType;
  /** For keep-it-going: specific situation to use */
  situationId?: string;
}

export function VoiceChatWindow({ onClose, scenarioType, situationId }: VoiceChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentArchetype, setCurrentArchetype] = useState<string>("");
  const messageIdRef = useRef(0);
  const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substring(7)}`);

  // For keep-it-going: store context for state persistence across turns
  const [keepItGoingContext, setKeepItGoingContext] = useState<KeepItGoingContext | null>(null);

  const addMessage = (
    sender: ChatMessage["sender"],
    text: string,
    options?: { archetype?: string; isIntroduction?: boolean; coachLevel?: ChatMessage["coachLevel"] }
  ) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: String(messageIdRef.current++),
        sender,
        text,
        archetype: options?.archetype,
        isIntroduction: options?.isIntroduction,
        coachLevel: options?.coachLevel,
      },
    ]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage;
    setInputMessage("");
    addMessage("user", userMessage);
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages
        .filter((msg) => !msg.isIntroduction && msg.sender !== "coach")
        .map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        }));

      const response = await fetch("/api/scenarios/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionIdRef.current,
          scenario_type: scenarioType,
          conversation_history: conversationHistory,
          // For keep-it-going: pass context for state persistence
          ...(scenarioType === "keep-it-going" && keepItGoingContext && { keepItGoingContext }),
        }),
      });

      if (!response.ok) {
        console.error("API Error:", response.status, response.statusText);
        const errorData = await response.json();
        addMessage("ai", `Error: ${errorData.error || response.statusText}`);
        return;
      }

      const data = await response.json();
      const aiResponseText = data.text;
      const archetype = data.archetype;

      if (archetype && !currentArchetype) {
        setCurrentArchetype(archetype);
      }

      // For keep-it-going: store updated context for next turn
      if (data.keepItGoingContext) {
        setKeepItGoingContext(data.keepItGoingContext);
      }

      addMessage("ai", aiResponseText, { archetype });

      if (data.evaluation) {
        const evaluation = data.evaluation as SmallEvaluation;
        addMessage(
          "coach",
          `Score ${Math.round(evaluation.score)}/10 — ${evaluation.feedback}`,
          { coachLevel: "small" }
        );
      }

      if (data.milestoneEvaluation) {
        const evaluation = data.milestoneEvaluation as MilestoneEvaluation;
        const lines = [
          evaluation.turn ? `Milestone (Round ${evaluation.turn})` : "Milestone Feedback",
          `Score ${Math.round(evaluation.score)}/10 — ${evaluation.feedback}`,
          evaluation.strengths?.length ? `Strengths: ${evaluation.strengths.join("; ")}` : "",
          evaluation.improvements?.length ? `Improve: ${evaluation.improvements.join("; ")}` : "",
          evaluation.suggestedNextLine ? `Try: "${evaluation.suggestedNextLine}"` : "",
        ].filter(Boolean);
        addMessage("coach", lines.join("\n"), { coachLevel: "milestone" });
      }

    } catch (error) {
      console.error("Failed to send message:", error);
      addMessage("ai", `Failed to connect to AI: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to scroll to the bottom of the chat
  useEffect(() => {
    const scrollArea = document.getElementById("chat-scroll-area");
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [messages]);

  const scenarioTitles: Record<ChatScenarioType, string> = {
    "practice-openers": "Practice Openers",
    "practice-career-response": "Practice Career Response",
    "practice-shittests": "Practice Shit-Tests",
    "keep-it-going": "Keep It Going",
  };

  // Get initial woman description when chat opens
  useEffect(() => {
    let isMounted = true;

    const getInitialDescription = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/scenarios/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "INIT", // Special message to trigger description
            session_id: sessionIdRef.current,
            scenario_type: scenarioType,
            conversation_history: [],
            // For keep-it-going: pass selected situation
            ...(scenarioType === "keep-it-going" && situationId && { situation_id: situationId }),
          }),
        });

        if (response.ok && isMounted) {
          const data = await response.json();
          if (data.archetype) {
            setCurrentArchetype(data.archetype);
          }
          // For keep-it-going: store initial context
          if (data.keepItGoingContext) {
            setKeepItGoingContext(data.keepItGoingContext);
          }
          setMessages([
            {
              id: "0",
              sender: "ai",
              text: data.text,
              isIntroduction: Boolean(data.isIntroduction),
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to get initial description:", error);
        if (isMounted) {
          setMessages([{ id: "0", sender: "ai", text: "*A woman appears on the street ahead of you. What do you say?*" }]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    getInitialDescription();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency - only run once on mount

  return (
    <Card className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm pt-safe pb-safe">
      <div
        className="relative w-full max-w-2xl mx-auto h-[calc(var(--app-vh)*90)] flex flex-col bg-card border-2 border-border rounded-lg shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-window-title"
      >
        <CardHeader className="flex flex-row items-center justify-between border-b border-border">
          <div>
            <CardTitle id="chat-window-title" className="text-2xl text-foreground">{scenarioTitles[scenarioType]}</CardTitle>
            {currentArchetype && (
              <p className="text-sm text-muted-foreground mt-1">
                Practicing with: <span className="text-primary font-semibold">{currentArchetype}</span>
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-destructive/10">
            <XCircle className="h-6 w-6 text-muted-foreground hover:text-destructive" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea id="chat-scroll-area" className="h-full p-6">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-3 ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground font-medium"
                        : msg.sender === "coach"
                        ? "bg-muted/60 border border-border text-foreground text-sm"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-lg px-4 py-3 bg-card border border-border text-foreground">
                    <p className="animate-pulse">*thinking...*</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <div className="p-4 border-t border-border bg-card flex items-center gap-2">
          <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
            <Input
              placeholder="Type what you'd say..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            <Button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              size="icon"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}
