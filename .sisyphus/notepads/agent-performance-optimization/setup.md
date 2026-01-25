# Inngest Dev Server Setup

## Overview
The Inngest dev server is required for the AI agent to process background jobs and messages. Without it running, the agent cannot execute workflows.

## Starting the Server

```bash
npx inngest-cli@latest dev
```

The server will start on **port 8288**.

## Verification

Verify the server is running:

```bash
curl http://localhost:8288/health
```

Expected response: HTTP 200 with health status.

## Why It's Needed

- **Background Job Processing**: Inngest handles all async workflows (AI message processing, file operations, etc.)
- **Agent Message Queue**: AI agent messages are queued and processed by Inngest jobs
- **Development Workflow**: Required for local development to test agent functionality

## Troubleshooting

- **Port 8288 already in use**: Kill the existing process or use a different port
- **Command not found**: Ensure Node.js and npm/bun are installed
- **Connection refused**: Server may not have started; check terminal output for errors

## Integration with Development

Start this alongside:
- `npm run dev` (Next.js frontend)
- `npx convex dev` (Convex backend)

All three services must be running for full functionality.
