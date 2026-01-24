import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGenerationEvents } from "../hooks/use-generation-events";
import { Id } from "../../../../convex/_generated/dataModel";

const PREVIEW_MAX_LINES = 12;

const clampPreview = (preview?: string) => {
  if (!preview) return null;
  const lines = preview.split("\n");
  if (lines.length <= PREVIEW_MAX_LINES) {
    return preview;
  }
  return `${lines.slice(0, PREVIEW_MAX_LINES).join("\n")}\n…`;
};

export function GenerationLogPanel({ projectId }: { projectId: Id<"projects"> }) {
  const events = useGenerationEvents({ projectId });

  const items = useMemo(() => events ?? [], [events]);

  return (
    <div className="border-t bg-background">
      <div className="flex items-center justify-between px-3 py-2 text-sm font-medium">
        <span>Generation Log</span>
        <span className="text-muted-foreground text-xs">
          {items.length} event{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <ScrollArea className="h-44 px-3 pb-3">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            No generation activity yet.
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {items.map((event) => {
              const preview = clampPreview(event.preview ?? undefined);
              const timestamp = new Date(event.createdAt).toLocaleTimeString();

              return (
                <div key={event._id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{timestamp}</span>
                    <span className="font-medium">{event.message}</span>
                  </div>
                  {event.filePath && (
                    <div className="text-xs text-muted-foreground">
                      {event.filePath}
                    </div>
                  )}
                  {preview && (
                    <pre className="text-xs bg-muted/40 rounded-md p-2 whitespace-pre-wrap">
                      {preview}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
