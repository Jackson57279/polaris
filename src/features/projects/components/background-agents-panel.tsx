"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  LoaderIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XIcon,
  PlayIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ky from "ky";
import { toast } from "sonner";

interface BackgroundAgentsPanelProps {
  projectId: Id<"projects">;
}

export function BackgroundAgentsPanel({
  projectId,
}: BackgroundAgentsPanelProps) {
  const agents = useQuery(api.agents.getAgents, { projectId }) ?? [];

  const handleCancelAgent = async (agentId: string) => {
    try {
      await ky.post("/api/agents/cancel", {
        json: { agentId },
      });
      toast.success("Agent cancelled");
    } catch {
      toast.error("Failed to cancel agent");
    }
  };

  if (agents.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClockIcon className="size-4" />
          Background Agents
        </CardTitle>
        <CardDescription className="text-xs">
          Track long-running operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {agents.map((agent) => (
          <AgentItem
            key={agent._id}
            agent={agent}
            onCancel={() => handleCancelAgent(agent._id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function AgentItem({
  agent,
  onCancel,
}: {
  agent: any;
  onCancel: () => void;
}) {
  const getStatusIcon = () => {
    switch (agent.status) {
      case "pending":
      case "running":
        return (
          <LoaderIcon className="size-4 animate-spin text-blue-500" />
        );
      case "completed":
        return (
          <CheckCircleIcon className="size-4 text-green-500" />
        );
      case "failed":
        return (
          <XCircleIcon className="size-4 text-red-500" />
        );
      case "cancelled":
        return (
          <XCircleIcon className="size-4 text-gray-500" />
        );
      default:
        return (
          <ClockIcon className="size-4 text-gray-500" />
        );
    }
  };

  const getStatusText = () => {
    switch (agent.status) {
      case "pending":
        return "Queued";
      case "running":
        return "Running";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "cancelled":
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  const canCancel = agent.status === "pending" || agent.status === "running";

  return (
    <div className="space-y-2 p-3 bg-muted rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{agent.title}</p>
            <p className="text-xs text-muted-foreground">
              {getStatusText()}
              {agent.currentStep && ` - ${agent.currentStep}`}
            </p>
          </div>
        </div>
        {canCancel && (
          <Button
            size="icon"
            variant="ghost"
            className="size-6 shrink-0"
            onClick={onCancel}
          >
            <XIcon className="size-3" />
          </Button>
        )}
      </div>

      {(agent.status === "running" || agent.status === "pending") && (
        <Progress value={agent.progress} className="h-2" />
      )}

      {agent.status === "failed" && agent.error && (
        <p className="text-xs text-destructive mt-1">{agent.error}</p>
      )}

      {agent.description && (
        <p className="text-xs text-muted-foreground">{agent.description}</p>
      )}
    </div>
  );
}
