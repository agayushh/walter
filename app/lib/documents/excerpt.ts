function pieces(text: string) {
  const blocks = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const block of blocks.length ? blocks : [text]) {
    for (let i = 0; i < block.length; i += 700) {
      const slice = block.slice(i, i + 700).trim();
      if (slice) chunks.push(slice);
    }
  }
  return chunks;
}

export function relevantExcerpt(
  documents: { fileName: string; content: string }[],
  query: string,
  budget = 6000,
) {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);

  const ranked = documents.flatMap((doc) =>
    pieces(doc.content).map((text, index) => {
      const hay = text.toLowerCase();
      const overlap = terms.reduce(
        (score, term) => score + (hay.includes(term) ? 1 : 0),
        0,
      );
      return {
        fileName: doc.fileName,
        text,
        score: overlap + 1 / (index + 1),
      };
    }),
  );

  ranked.sort((a, b) => b.score - a.score);

  const picked: string[] = [];
  const seen = new Set<string>();
  let used = 0;
  for (const chunk of ranked) {
    if (seen.has(chunk.text)) continue;
    seen.add(chunk.text);
    if (used >= budget) break;
    picked.push(`From ${chunk.fileName}:\n${chunk.text}`);
    used += chunk.text.length;
    if (picked.length >= 6) break;
  }
  return picked.join("\n\n");
}
