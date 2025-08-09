const STORAGE_KEY = 'OPENAI_API_KEY'

export function getOpenAIApiKey(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setOpenAIApiKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key)
}

type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high'

export async function callOpenAIResponse(
  input: string,
  opts?: { instructions?: string; reasoningEffort?: ReasoningEffort; tools?: any[] }
): Promise<string> {
  const apiKey = getOpenAIApiKey()
  if (!apiKey) throw new Error('Missing OpenAI API key. Click the key icon to set it.')

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5-mini-2025-08-07',
      input,
      ...(opts?.instructions ? { instructions: opts.instructions } : {}),
      ...(opts?.reasoningEffort ? { reasoning: { effort: opts.reasoningEffort } } : {}),
      ...(opts?.tools ? { tools: opts.tools } : {}),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI error: ${res.status} ${text}`)
  }

  const data: any = await res.json()
  // Extract text from Responses API
  let outputText = ''
  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (typeof c.text === 'string') outputText += c.text
        }
      } else if (item && item.type && item.input) {
        // tool call fallback – stringify
        try {
          outputText += String(item.input)
        } catch {
          // ignore
        }
      }
    }
  }
  if (!outputText && typeof data.output_text === 'string') {
    outputText = data.output_text
  }
  return outputText || '[no text]'
}


