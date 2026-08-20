import { Translate } from '@google-cloud/translate/build/src/v2/index.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const apiKey = process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY;

async function test() {
  if (!apiKey) {
    console.error("API key missing");
    return;
  }
  try {
    const translateClient = new Translate({ key: apiKey });
    const [translation] = await translateClient.translate("Hello world", {
      from: 'en',
      to: 'hi'
    });
    console.log("Translation success:", translation);
  } catch (err) {
    console.error("Translation error:", err.message || err);
  }
}
test();
