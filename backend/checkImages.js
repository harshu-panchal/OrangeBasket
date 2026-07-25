import fetch from 'node-fetch';

const images = [
    "https://www.bigbasket.com/media/uploads/p/l/40127506_7-aashirvaad-shudh-chakki-atta.jpg",
    "https://www.bigbasket.com/media/uploads/p/l/40158283_5-fortune-maida.jpg",
    "https://www.bigbasket.com/media/uploads/p/l/40106887_4-tata-sampann-besan.jpg",
    "https://www.bigbasket.com/media/uploads/p/l/10000455_16-rajdhani-soojirava.jpg",
    "https://www.bigbasket.com/media/uploads/p/l/1214041_1-aashirvaad-atta-multigrain-5-kg-pouch.jpg",
    "https://www.bigbasket.com/media/uploads/p/l/40000291_10-tata-sampann-unpolished-toor-dalarhar-dal.jpg",
    "https://www.bigbasket.com/media/uploads/p/l/40000293_10-tata-sampann-unpolished-moong-dal.jpg",
    "https://www.bigbasket.com/media/uploads/p/l/40000289_11-tata-sampann-unpolished-chana-dal.jpg",
    "https://www.bigbasket.com/media/uploads/p/l/40000294_10-tata-sampann-unpolished-masoor-dal.jpg",
    "https://www.bigbasket.com/media/uploads/p/l/40000297_9-tata-sampann-unpolished-urad-dal-whole.jpg",
    "https://www.bigbasket.com/media/uploads/p/l/40000299_10-tata-sampann-unpolished-rajma-chitra.jpg",
    "https://www.bigbasket.com/media/uploads/p/l/40000296_9-tata-sampann-unpolished-kabuli-chana.jpg"
];

async function checkImages() {
    for (const url of images) {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            console.log(`${res.status} - ${url}`);
        } catch (e) {
            console.log(`Error - ${url}`);
        }
    }
}

checkImages();
