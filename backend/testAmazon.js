import fetch from 'node-fetch';
const images = [
    "https://m.media-amazon.com/images/I/71D0Y7D7q6L._SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71R2H5B++6L._SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81tXp-x2DNL._SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71W2bNIfJgL._SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81vP+-3sB8L._SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71qJ9EwP83L._SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71W1PqVbYDL._SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81-06OQ1g9L._SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81Pj6lXQ2VL._SL1500_.jpg"
];
async function test() {
    for (const url of images) {
        try {
            const r = await fetch(url.replace('+', '%2B'), { 
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            console.log(r.status, url);
        } catch(e) {
            console.log('Error', url);
        }
    }
}
test();
