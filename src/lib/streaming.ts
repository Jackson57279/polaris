/**
 * Server-Sent Events (SSE) streaming utilities for AI responses
 * 
 * Provides helpers for creating SSE responses and writing typed events
 * for streaming AI tool calls, results, and completions.
 */

export type SSEEvent =
  | { type: 'text'; content: string }
  | { type: 'toolCall'; toolCall: { id: string; name: string; args: unknown } }
  | { type: 'toolResult'; toolResult: { id: string; result: unknown } }
  | { type: 'error'; error: string }
  | { type: 'complete' };

/**
 * Creates an SSE response with proper headers and stream
 * 
 * @param stream - ReadableStream to send as response body
 * @returns Response object configured for SSE
 * 
 * @example
 * ```typescript
 * const { readable, writable } = new TransformStream();
 * const response = createSSEResponse(readable);
 * // Start writing events to writable stream
 * ```
 */
export function createSSEResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * Writes an SSE event to the stream
 * 
 * Formats event as: `data: {json}\n\n`
 * 
 * @param writer - WritableStreamDefaultWriter to write to
 * @param event - SSEEvent to serialize and send
 * @throws If writing to stream fails
 * 
 * @example
 * ```typescript
 * const { readable, writable } = new TransformStream();
 * const writer = writable.getWriter();
 * 
 * await writeSSEEvent(writer, {
 *   type: 'text',
 *   content: 'Hello, world!'
 * });
 * 
 * await writeSSEEvent(writer, {
 *   type: 'toolCall',
 *   toolCall: {
 *     id: 'call_123',
 *     name: 'search',
 *     args: { query: 'typescript' }
 *   }
 * });
 * ```
 */
export async function writeSSEEvent(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  event: SSEEvent
): Promise<void> {
  const encoder = new TextEncoder();
  const data = JSON.stringify(event);
  const message = `data: ${data}\n\n`;
  await writer.write(encoder.encode(message));
}

/**
 * Helper to create a transform stream for SSE events
 * 
 * @returns Object with readable and writable streams
 * 
 * @example
 * ```typescript
 * const { readable, writable } = createSSEStream();
 * const response = createSSEResponse(readable);
 * const writer = writable.getWriter();
 * 
 * // Write events
 * await writeSSEEvent(writer, { type: 'text', content: 'Processing...' });
 * await writeSSEEvent(writer, { type: 'complete' });
 * await writer.close();
 * ```
 */
export function createSSEStream(): {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
} {
  return new TransformStream();
}
