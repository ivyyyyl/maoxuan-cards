import { describe, expect, it } from 'vitest';
import { QUOTES, shuffleQuotes } from './quotes';
import { buildDeepPrompt } from './prompt';

describe('quote dataset', () => {
  it('contains a playable number of quotes', () => {
    expect(QUOTES.length).toBe(144);
  });

  it('has unique ids, unique texts and complete fields', () => {
    const ids = new Set<string>();
    const texts = new Set<string>();
    for (const quote of QUOTES) {
      expect(quote.id).not.toBe('');
      expect(quote.text.trim().length).toBeGreaterThan(0);
      expect(quote.source.trim().length).toBeGreaterThan(0);
      expect(quote.excerpt.trim().length).toBeGreaterThan(0);
      expect(quote.interpretation.trim().length).toBeGreaterThan(0);
      expect(quote.tags.length).toBeGreaterThan(0);
      expect(ids.has(quote.id)).toBe(false);
      expect(texts.has(quote.text)).toBe(false);
      ids.add(quote.id);
      texts.add(quote.text);
    }
  });

  it('shuffles without dropping or duplicating entries', () => {
    const shuffled = shuffleQuotes(QUOTES, () => 0.42);
    expect(shuffled).toHaveLength(QUOTES.length);
    expect(new Set(shuffled.map((quote) => quote.id))).toEqual(new Set(QUOTES.map((quote) => quote.id)));
  });
});

describe('deep prompt builder', () => {
  it('embeds quote, source and interpretation instructions', () => {
    const prompt = buildDeepPrompt(QUOTES[0]);
    expect(prompt).toContain(QUOTES[0].text);
    expect(prompt).toContain(QUOTES[0].source);
    expect(prompt).toContain('思想内核');
    expect(prompt).toContain('现实应用');
    expect(prompt).toContain('常见误读');
  });
});
