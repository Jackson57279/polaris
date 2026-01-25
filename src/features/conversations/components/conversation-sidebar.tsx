import ky from "ky";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { 
  AlertCircleIcon,
  CopyIcon, 
  HistoryIcon, 
  LoaderIcon, 
  PlusIcon
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
  PromptInputTextarea,
  PromptInputTools,
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

export const ConversationSidebar = ({
  projectId,
}: ConversationSidebarProps) => {
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState<Id<"conversations"> | null>(null);

  const createConversation = useCreateConversation();
  const conversations = useConversations(projectId);

  const activeConversationId =
    selectedConversationId ?? conversations?.[0]?._id ?? null;

  const activeConversation = useConversation(activeConversationId);
  const conversationMessages = useMessages(activeConversationId);

  const isProcessing = conversationMessages?.some(
    (msg) => msg.status === "processing"
  );

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

  const handleCancel = async () => {
    const processingMessage = conversationMessages?.find(
      (msg) => msg.status === "processing"
    );

    if (!processingMessage) return;

    try {
      await ky.delete("/api/messages", {
        json: {
          messageId: processingMessage._id,
        },
      });
    } catch {
      toast.error("Failed to cancel message");
    }
  };

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

    // Trigger Inngest function via API
    try {
      await ky.post("/api/messages", {
        json: {
          conversationId,
          message: message.text,
        },
      });
    } catch {
      toast.error("Message failed to send");
    }

    setInput("");
  }

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
          {conversationMessages?.map((message, messageIndex) => (
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
                messageIndex === (conversationMessages?.length ?? 0) - 1 && (
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
            <PromptInputSubmit
              disabled={isProcessing ? false : !input}
              status={isProcessing ? "streaming" : undefined}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
    </>
  );
};
