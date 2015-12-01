import promptly from 'promptly';
import { promisify } from 'bluebird';

export const choose = promisify(promptly.choose);
export const confirm = promisify(promptly.confirm);
export const prompt = promisify(promptly.prompt);
