export const commonTypos = {
    "biskit": "biscuit",
    "biscut": "biscuit",
    "biscot": "biscuit",
    "sugr": "sugar",
    "suger": "sugar",
    "tomoto": "tomato",
    "tamato": "tomato",
    "pototo": "potato",
    "patato": "potato",
    "milke": "milk",
    "mik": "milk",
    "panner": "paneer",
    "panir": "paneer",
    "choclat": "chocolate",
    "chocolat": "chocolate",
    "choclate": "chocolate",
    "ata": "atta",
    "aata": "atta",
    "bred": "bread",
    "buter": "butter",
    "bater": "butter",
    "piza": "pizza",
    "pija": "pizza",
    "magi": "maggi",
    "magee": "maggi",
    "curd": "dahi",
    "onion": "kanda", // Some regional synonyms can be mapped here too if useful
};

export const applyTypoCorrection = (term) => {
    if (!term) return term;
    
    // Convert to lowercase and trim
    let normalized = term.toLowerCase().trim();
    
    // Check if the entire word is in the typo dictionary
    if (commonTypos[normalized]) {
        return commonTypos[normalized];
    }
    
    // Check if parts of the phrase are in the typo dictionary
    const words = normalized.split(/\s+/);
    let corrected = false;
    const correctedWords = words.map(w => {
        if (commonTypos[w]) {
            corrected = true;
            return commonTypos[w];
        }
        return w;
    });
    
    return corrected ? correctedWords.join(" ") : term;
};
