/**
 * Gemini Relay Whiteboard Client Utility with Unique Response Token Protocol
 * Ensures zero stale cache reads by enclosing system prompts with a unique
 * verification token and confirming the AI response starts and ends with that token.
 */

export function generateMiraToken(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MIRA_TOKEN_${ts}_${rand}`;
}

export function extractTokenFromText(text: string): string | null {
  const match = text.match(/(?:__)?(MIRA_TOKEN_[A-Za-z0-9_]+)(?:__)?/);
  return match ? match[1] : null;
}

export function formatPromptWithToken(prompt: string, token: string): string {
  return [
    `[SYSTEM INSTRUCTION: UNIQUE RESPONSE TOKEN PROTOCOL]`,
    `You are connected to LightSync MIRA via the Gemini Relay Whiteboard.`,
    `CRITICAL INTEGRITY PROTOCOL:`,
    `You MUST start and end your response with the following unique verification token:`,
    token,
    ``,
    `Strict Format Requirement:`,
    token,
    `<Your complete response here>`,
    token,
    ``,
    `Do not omit, modify, or place any characters before or after the token on the first and last lines.`,
    `The client application uses this token to match responses and verify that the whiteboard contains the latest response.`,
    ``,
    `[USER REQUEST / TASK]:`,
    prompt.trim()
  ].join('\n');
}

export function stripTokenFromResponse(rawText: string, token: string): string {
  if (!token) return rawText.trim();

  const coreToken = token.replace(/^__+|__+$/g, '');
  let activeToken = '';
  if (rawText.includes(token)) {
    activeToken = token;
  } else if (rawText.includes(coreToken)) {
    activeToken = coreToken;
  } else {
    return rawText.trim();
  }

  const startIdx = rawText.indexOf(activeToken);
  const endIdx = rawText.lastIndexOf(activeToken);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return rawText.slice(startIdx + activeToken.length, endIdx).trim();
  } else if (startIdx !== -1) {
    return rawText.slice(startIdx + activeToken.length).trim();
  }
  return rawText.trim();
}

export interface RelayPromptResponse {
  status: 'accepted' | 'busy' | 'error';
  request_id?: number;
  message?: string;
  retry_after?: number;
}

export interface RelayWhiteboardResponse {
  request_id: number;
  state: 'idle' | 'queued' | 'typing' | 'generating' | 'ready' | 'error';
  prompt: string;
  text: string;
  token?: string | null;
  updated_at: string;
  message: string;
  public_url?: string | null;
  has_image?: boolean;
}

/**
 * Sends a prompt to the Gemini Relay endpoint enforcing the unique token protocol.
 * Polls GET /api/response until matching token is verified on the whiteboard.
 */
export async function sendPromptWithToken(
  prompt: string,
  relayUrl: string = 'http://127.0.0.1:8000',
  timeoutSec: number = 15
): Promise<{ text: string; token: string; raw: RelayWhiteboardResponse } | null> {
  const baseUrl = relayUrl.replace(/\/+$/, '');
  const token = generateMiraToken();
  const formattedPrompt = formatPromptWithToken(prompt, token);

  try {
    // 1. POST /api/prompt
    const postRes = await fetch(`${baseUrl}/api/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: formattedPrompt })
    });

    if (!postRes.ok) {
      console.warn(`[MIRA Relay] Prompt rejected with status ${postRes.status}`);
      return null;
    }

    const postData: RelayPromptResponse = await postRes.json();
    if (postData.status !== 'accepted' || !postData.request_id) {
      console.warn('[MIRA Relay] Server busy or prompt not accepted:', postData);
      return null;
    }

    const requestId = postData.request_id;
    const startTime = Date.now();

    // 2. Poll GET /api/response
    while (Date.now() - startTime < timeoutSec * 1000) {
      await new Promise(r => setTimeout(r, 600));

      try {
        const pollRes = await fetch(`${baseUrl}/api/response`);
        if (pollRes.ok) {
          const pollData: RelayWhiteboardResponse = await pollRes.json();

          if (pollData.request_id === requestId && pollData.state === 'ready') {
            if (pollData.text && pollData.text.includes(token)) {
              const cleanText = stripTokenFromResponse(pollData.text, token);
              return {
                text: cleanText,
                token,
                raw: pollData
              };
            }
          } else if (pollData.state === 'error') {
            console.warn('[MIRA Relay] Whiteboard returned error:', pollData.message);
            return null;
          }
        }
      } catch (pollErr) {
        console.debug('[MIRA Relay] Polling error:', pollErr);
      }
    }

    console.warn(`[MIRA Relay] Timed out waiting for token ${token}`);
    return null;
  } catch (err) {
    console.error('[MIRA Relay] Direct relay request failed:', err);
    return null;
  }
}
