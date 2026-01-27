import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/stack-auth-api";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  agentId: z.string(),
});

export async function POST(request: Request) {
  const { user, response } = await requireAuth();

  if (!user) {
    return response;
  }

  const body = await request.json();
  const { agentId } = requestSchema.parse(body);

  try {
    await convex.mutation(api.agents.cancelAgent, {
      agentId: agentId as Id<"backgroundAgents">,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel agent failed:", error);
    return NextResponse.json(
      { error: "Failed to cancel agent" },
      { status: 500 }
    );
  }
}
