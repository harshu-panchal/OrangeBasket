import { Translate } from '@google-cloud/translate/build/src/v2/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const apiKey = process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY;

let translateClient = null;

if (apiKey && apiKey !== 'your_api_key_here') {
  translateClient = new Translate({ key: apiKey });
} else {
  console.warn("GOOGLE_CLOUD_TRANSLATE_API_KEY is not defined or is placeholder. Translations will fallback to original text.");
}

export default translateClient;
