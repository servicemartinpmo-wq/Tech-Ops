import { openai } from "@workspace/integrations-openai-ai-server";

export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MODEL = "text-embedding-3-small";

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(t => t.length > 1);
}

function ngramTokenize(text: string, n: number): string[] {
  const tokens = tokenize(text);
  const ngrams: string[] = [...tokens];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join("_"));
  }
  return ngrams;
}

export function generateLocalEmbedding(text: string): number[] {
  const vector = new Float64Array(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = ngramTokenize(text, 2);
  if (tokens.length === 0) return Array.from(vector);

  const termFreq = new Map<string, number>();
  for (const token of tokens) termFreq.set(token, (termFreq.get(token) || 0) + 1);
  const maxFreq = Math.max(...termFreq.values());

  for (const [term, freq] of termFreq) {
    const tf = 0.5 + 0.5 * (freq / maxFreq);
    const dim1 = hashCode(term) % EMBEDDING_DIMENSIONS;
    const dim2 = hashCode(term + "_salt1") % EMBEDDING_DIMENSIONS;
    const dim3 = hashCode(term + "_salt2") % EMBEDDING_DIMENSIONS;
    const sign1 = hashCode(term + "_sign") % 2 === 0 ? 1 : -1;
    const sign2 = hashCode(term + "_sign2") % 2 === 0 ? 1 : -1;
    const sign3 = hashCode(term + "_sign3") % 2 === 0 ? 1 : -1;
    vector[dim1] += sign1 * tf;
    vector[dim2] += sign2 * tf * 0.7;
    vector[dim3] += sign3 * tf * 0.4;
  }

  let magnitude = 0;
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) magnitude += vector[i] * vector[i];
  magnitude = Math.sqrt(magnitude);
  if (magnitude > 0) for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) vector[i] /= magnitude;

  return Array.from(vector);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.slice(0, 8192);
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input,
    });
    const embedding = response.data[0]?.embedding;
    if (embedding && embedding.length === EMBEDDING_DIMENSIONS) {
      return embedding;
    }
    console.warn(`[Embeddings] OpenAI returned unexpected dimension: ${embedding?.length}. Falling back to local.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Embeddings] OpenAI embedding call failed (${message}). Falling back to local feature-hashing.`);
  }
  return generateLocalEmbedding(input);
}

export function buildSearchText(parts: {
  domain?: string; subdomain?: string; title?: string;
  symptoms?: string[]; resolutionSteps?: string[]; tags?: string[];
}): string {
  const sections = [
    parts.domain || "", parts.subdomain || "", parts.title || "",
    (parts.symptoms || []).join(" "),
    (parts.resolutionSteps || []).join(" "),
    (parts.tags || []).join(" "),
  ];
  return sections.filter(Boolean).join(" ").toLowerCase();
}
