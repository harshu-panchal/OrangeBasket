import axios from 'axios';

async function testTranslate() {
  try {
    const res = await axios.post('http://localhost:5000/api/translate/batch', {
      texts: ["App Settings", "Language"],
      targetLang: "hi",
      sourceLang: "en"
    });
    console.log(res.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
}

testTranslate();
