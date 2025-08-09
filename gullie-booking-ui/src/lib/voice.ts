export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition)
}

export function startListening(onResult: (text: string) => void): () => void {
  const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!Recognition) {
    return () => {}
  }
  const recognition = new Recognition()
  recognition.lang = 'en-US'
  recognition.continuous = false
  recognition.interimResults = true

  let finalTranscript = ''

  recognition.onresult = (event: any) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) finalTranscript += transcript
      else interim += transcript
    }
    const text = (finalTranscript || interim).trim()
    if (text) onResult(text)
  }

  recognition.start()
  return () => recognition.stop()
}


