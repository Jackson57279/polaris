import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/stack-auth-api";
import { tasks, runs } from "@trigger.dev/sdk/v3";

import { convex } from "@/lib/convex-client";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const postRequestSchema = z.object({
  conversationId: z.string(),
  message: z.string(),
});

const deleteRequestSchema = z.object({
  messageId: z.string(),
});

export async function POST(request: Request) {
  const { user, response } = await requireAuth();
  
  if (!user) {
    return response;
  }

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { conversationId, message } = postRequestSchema.parse(body);

  // Call convex mutation, query
  const conversation = await convex.query(api.system.getConversationById, {
    internalKey,
    conversationId: conversationId as Id<"conversations">,
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const projectId = conversation.projectId;

  const processingMessages = await convex.query(api.system.getProcessingMessages, {
    internalKey,
    projectId,
  });

  if (processingMessages.length > 0) {
    return NextResponse.json(
      { error: "A message is already being processed", messageId: processingMessages[0]._id },
      { status: 409 }
    );
  }

  await convex.mutation(api.system.createMessage, {
    internalKey,
    conversationId: conversationId as Id<"conversations">,
    projectId,
    role: "user",
    content: message,
  });
  const assistantMessageId = await convex.mutation(
    api.system.createMessage,
    {
      internalKey,
      conversationId: conversationId as Id<"conversations">,
      projectId,
      role: "assistant",
      content: "",
      status: "processing",
    }
  );

  const handle = await tasks.trigger("process-message", {
    messageId: assistantMessageId,
  });

  await convex.mutation(api.system.updateMessageTriggerRunId, {
    internalKey,
    messageId: assistantMessageId,
    triggerRunId: handle.id,
  });

  return NextResponse.json({
    success: true,
    runId: handle.id,
    messageId: assistantMessageId,
  });
}

export async function DELETE(request: Request) {
  const { user, response } = await requireAuth();

  if (!user) {
    return response;
  }

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { messageId } = deleteRequestSchema.parse(body);

  const message = await convex.query(api.system.getMessageById, {
    internalKey,
    messageId: messageId as Id<"messages">,
  });

  if (message?.triggerRunId) {
    await runs.cancel(message.triggerRunId);
  }

  await convex.mutation(api.system.cancelMessage, {
    internalKey,
    messageId: messageId as Id<"messages">,
  });

  return NextResponse.json({ success: true });
}
