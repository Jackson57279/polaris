import { useQuery } from "convex/react";
import { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";

export const useGenerationEvents = ({
  projectId,
  limit = 200,
}: {
  projectId: Id<"projects">;
  limit?: number;
}) => {
  return useQuery(api.projects.getGenerationEvents, { projectId, limit });
};
