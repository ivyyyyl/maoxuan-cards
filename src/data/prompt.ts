import type { MaoQuote } from './quotes';

export interface AiMessage {
  role: 'system' | 'user';
  content: string;
}

export function buildDeepPrompt(quote: MaoQuote): string {
  return [
    '你是毛泽东著作研究助手。请针对下面这条语录，做一次深入、准确的讲解，并和我继续对话。',
    '',
    `语录：${quote.text}`,
    `出处：${quote.source}`,
    `原文选段：${quote.excerpt}`,
    `相关主题：${quote.tags.join('、')}`,
    '',
    '请按以下结构回答：',
    '1. 历史背景：这句话是在什么背景下讲的，针对什么问题；',
    '2. 思想内核：这句话的核心观点和方法论是什么；',
    '3. 现实应用：在今天的工作、学习或生活中可以怎么用；',
    '4. 常见误读：这句话容易被怎么理解偏；',
    '5. 延伸讨论：提出 3 个值得继续深挖的问题。',
    '',
    '如果你对某条原文的记忆不确定，请明确说明，并建议我查阅哪一篇文献核实。',
  ].join('\n');
}

export function buildAiMessages(quote: MaoQuote): AiMessage[] {
  return [
    {
      role: 'system',
      content: '你是毛泽东著作研究助手。请认真、准确地完成用户给出的解读任务。',
    },
    {
      role: 'user',
      content: buildDeepPrompt(quote),
    },
  ];
}
