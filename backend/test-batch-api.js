import http from 'http';

const data = JSON.stringify({
  texts: ['Hello', 'World', 'Today Deals'],
  targetLang: 'hi',
  sourceLang: 'en'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/translate/batch',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body}`);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
