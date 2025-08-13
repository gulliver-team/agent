const STORAGE_KEY = 'OPENAI_API_KEY'
const MODEL_STORAGE_KEY = 'OPENAI_MODEL'
const DEFAULT_MODEL = 'gpt-5-mini-2025-08-07'

export const AVAILABLE_MODELS = [
  { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini', description: 'Fast and efficient' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest GPT-4 optimized' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Faster GPT-4o' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Enhanced GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and reliable' }
]

export function getOpenAIApiKey(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setOpenAIApiKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key)
}

export function getSelectedModel(): string {
  return localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL
}

export function setSelectedModel(model: string) {
  localStorage.setItem(MODEL_STORAGE_KEY, model)
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
      model: getSelectedModel(),
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


