// src/confirm.js
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { isYes, parseAction, t } from './i18n.js';

/**
 * @param {string} question
 */
export async function ask(question) {
  const rl = readline.createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

/**
 * @param {string} prompt
 */
export async function askDaNet(prompt) {
  const answer = await ask(`${prompt}\n${t().yesNo}`);
  return isYes(answer);
}

/** @param {string} fileName */
export async function askOverwrite(fileName) {
  return askDaNet(t().overwritePrompt(fileName));
}

/**
 * @returns {Promise<'download' | 'delete'>}
 */
export async function askDownloadOrDelete() {
  for (;;) {
    const answer = await ask(t().askAction);
    const action = parseAction(answer);
    if (action) return action;
    console.log(t().actionNotRecognized);
  }
}

/** @param {string} question */
export async function confirm(question) {
  const answer = await ask(`${question} [y/N] `);
  return isYes(answer);
}
