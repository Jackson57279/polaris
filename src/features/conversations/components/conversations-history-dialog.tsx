"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquareIcon, SearchIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useConversations } from "../hooks/use-conversations";
import { Id } from "../../../../convex/_generated/dataModel";

interface ConversationsHistoryDialogProps {
  projectId: Id<"projects">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (conversationId: Id<"conversations">) => void;
}

export const ConversationsHistoryDialog = ({
  projectId,
  open,
  onOpenChange,
  onSelectConversation,
}: ConversationsHistoryDialogProps) => {
  const [search, setSearch] = useState("");
  const conversations = useConversations(projectId);

  const filteredConversations = conversations?.filter((conversation) =>
    conversation.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (conversationId: Id<"conversations">) => {
    onSelectConversation(conversationId);
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conversation History</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ScrollArea className="h-[300px]">
          {!filteredConversations || filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <MessageSquareIcon className="size-8 mb-2" />
              <p className="text-sm">
                {search ? "No conversations found" : "No conversations yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation._id}
                  onClick={() => handleSelect(conversation._id)}
                  className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="font-medium text-sm truncate">
                    {conversation.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(conversation.updatedAt, {
                      addSuffix: true,
                    })}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
