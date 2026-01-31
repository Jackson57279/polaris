"use client";

import ky from "ky";
import { toast } from "sonner";
import { useState, useEffect, useCallback, useRef } from "react";
import { 
  AlertCircleIcon,
  CopyIcon, 
  HistoryIcon, 
  LoaderIcon, 
  PlusIcon,
  XIcon,
} from "lucide-react";
import { isElectron } from "@/lib/electron/environment";
import { ipcClient } from "@/lib/electron/ipc-client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  AIStatusIndicator,
  type AIStatus,
} from "@/components/ai-elements/ai-status-indicator";
import { StreamingIndicator } from "@/components/ai-elements/streaming-indicator";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";

import {
  useConversation,
  useConversations,
  useCreateConversation,
  useMessages,
} from "../hooks/use-conversations";
import { ConversationsHistoryDialog } from "./conversations-history-dialog";

import { Id } from "../../../../convex/_generated/dataModel";
import { DEFAULT_CONVERSATION_TITLE } from "../../../../convex/constants";

interface ConversationSidebarProps {
  projectId: Id<"projects">;
};

interface StreamingState {
  isStreaming: boolean;
  content: string;
  toolCalls: Array<{ id: string; name: string; args: unknown }>;
  toolResults: Array<{ id: string; result: unknown }>;
}

export const ConversationSidebar = ({
  projectId,
}: ConversationSidebarProps) => {
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState<Id<"conversations"> | null>(null);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    content: "",
    toolCalls: [],
    toolResults: [],
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const createConversation = useCreateConversation();
  const conversations = useConversations(projectId);

  const activeConversationId =
    selectedConversationId ?? conversations?.[0]?._id ?? null;

  const activeConversation = useConversation(activeConversationId);
  const conversationMessages = useMessages(activeConversationId);

  const isProcessing = conversationMessages?.some(
    (msg) => msg.status === "processing"
  ) || streamingState.isStreaming;

  const aiStatus: AIStatus = isProcessing ? "thinking" : "idle";

  useEffect(() => {
    if (!isElectron()) return;

    if (isProcessing) {
      ipcClient.window_setTitle("⚡ Polaris IDE").catch(() => {});
    } else {
      ipcClient.window_setTitle("Polaris IDE").catch(() => {});
    }
  }, [isProcessing]);

  const handleCreateConversation = async () => {
    try {
      const newConversationId = await createConversation({
        projectId,
        title: DEFAULT_CONVERSATION_TITLE,
      });
      setSelectedConversationId(newConversationId);
      return newConversationId;
    } catch {
      toast.error("Unable to create new conversation");
      return null;
    }
  };

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreamingState({
      isStreaming: false,
      content: "",
      toolCalls: [],
      toolResults: [],
    });
  }, []);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (isProcessing && !message.text) {
      await handleCancel();
      setInput("");
      return;
    }

    let conversationId = activeConversationId;

    if (!conversationId) {
      conversationId = await handleCreateConversation();
      if (!conversationId) {
        return;
      }
    }

    // Reset streaming state
    setStreamingState({
      isStreaming: true,
      content: "",
      toolCalls: [],
      toolResults: [],
    });

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/messages/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          message: message.text,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              
              switch (event.type) {
                case "text":
                  setStreamingState((prev) => ({
                    ...prev,
                    content: event.content,
                  }));
                  break;
                case "toolCall":
                  setStreamingState((prev) => ({
                    ...prev,
                    toolCalls: [...prev.toolCalls, event.toolCall],
                  }));
                  break;
                case "toolResult":
                  setStreamingState((prev) => ({
                    ...prev,
                    toolResults: [...prev.toolResults, event.toolResult],
                  }));
                  break;
                case "error":
                  toast.error(event.error || "An error occurred");
                  setStreamingState((prev) => ({
                    ...prev,
                    isStreaming: false,
                  }));
                  break;
                case "complete":
                  setStreamingState((prev) => ({
                    ...prev,
                    isStreaming: false,
                  }));
                  break;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // User cancelled - this is expected
        console.log("Message generation cancelled by user");
      } else {
        console.error("Message failed to send:", error);
        toast.error(error instanceof Error ? error.message : "Message failed to send");
      }
      setStreamingState({
        isStreaming: false,
        content: "",
        toolCalls: [],
        toolResults: [],
      });
    } finally {
      abortControllerRef.current = null;
    }

    setInput("");
  };

  // Combine Convex messages with streaming state
  const displayMessages = conversationMessages?.map((msg) => {
    // If this is the last assistant message and we're streaming, show streaming content
    const isLastMessage = msg._id === conversationMessages[conversationMessages.length - 1]?._id;
    if (isLastMessage && msg.role === "assistant" && streamingState.isStreaming) {
      return {
        ...msg,
        content: streamingState.content || msg.content,
        status: "processing" as const,
      };
    }
    return msg;
  });

  return (
    <>
      <ConversationsHistoryDialog
        projectId={projectId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelectConversation={setSelectedConversationId}
      />
      <div className="flex flex-col h-full bg-sidebar">
      <div className="h-8.75 flex items-center justify-between border-b">
        <div className="text-sm truncate pl-3">
          {activeConversation?.title ?? DEFAULT_CONVERSATION_TITLE}
        </div>
        <div className="flex items-center px-1 gap-1">
          <Button
            size="icon-xs"
            variant="highlight"
            onClick={() => setHistoryOpen(true)}
          >
            <HistoryIcon className="size-3.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="highlight"
            onClick={handleCreateConversation}
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
      </div>
      <Conversation className="flex-1">
        <ConversationContent>
          {displayMessages?.map((message, messageIndex) => (
            <Message
              key={message._id}
              from={message.role}
            >
              <MessageContent>
                {message.status === "processing" && !message.content ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <LoaderIcon className="size-4 animate-spin" />
                    <span>Thinking</span>
                    <StreamingIndicator />
                  </div>
                ) : message.status === "processing" && message.content ? (
                  <div>
                    <MessageResponse>{message.content}</MessageResponse>
                    <div className="flex items-center gap-1 mt-2 text-muted-foreground text-xs">
                      <LoaderIcon className="size-3 animate-spin" />
                      <span>Generating...</span>
                    </div>
                  </div>
                ) : message.status === "failed" ? (
                  <div>
                    <MessageResponse>{message.content}</MessageResponse>
                    <div className="flex items-center gap-1 mt-2 text-destructive text-xs">
                      <AlertCircleIcon className="size-3" />
                      <span>Failed</span>
                    </div>
                  </div>
                ) : (
                  <MessageResponse>{message.content}</MessageResponse>
                )}
              </MessageContent>
              {message.role === "assistant" &&
                message.status === "completed" &&
                messageIndex === (displayMessages?.length ?? 0) - 1 && (
                  <MessageActions>
                    <MessageAction
                      onClick={() => {
                        navigator.clipboard.writeText(message.content)
                      }}
                      label="Copy"
                    >
                      <CopyIcon className="size-3" />
                    </MessageAction>
                  </MessageActions>
                )
              }
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="p-3 space-y-2">
        <AIStatusIndicator status={aiStatus} />
        <PromptInput
          onSubmit={handleSubmit}
          className="mt-2"
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Ask Polaris anything..."
              onChange={(e) => setInput(e.target.value)}
              value={input}
              disabled={isProcessing}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <div className="flex items-center gap-2">
              {streamingState.isStreaming && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  <XIcon className="size-4 mr-1" />
                  Cancel
                </Button>
              )}
              <PromptInputSubmit
                disabled={isProcessing ? false : !input}
                status={isProcessing ? "streaming" : undefined}
              />
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
    </>
  );
};
