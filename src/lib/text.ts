export function toPlainText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function keywordSnippet(text: string, keywords: string[], maxChars = 2_000): string {
  const cleaned = text.trim();
  if (!cleaned) {
    return "";
  }

  if (!keywords.length) {
    return cleaned.slice(0, maxChars);
  }

  const loweredKeywords = keywords
    .map((keyword) => keyword.trim().toLowerCase())
    .filter((keyword) => keyword.length > 0);

  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const matches = sentences.filter((sentence) => {
    const lowered = sentence.toLowerCase();
    return loweredKeywords.some((keyword) => lowered.includes(keyword));
  });

  const source = matches.length > 0 ? matches : sentences;
  let output = "";

  for (const sentence of source) {
    const candidate = output ? `${output} ${sentence}` : sentence;
    if (candidate.length > maxChars) {
      break;
    }
    output = candidate;
  }

  return output || cleaned.slice(0, maxChars);
}
