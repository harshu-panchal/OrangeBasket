import FestivalDealsSection from "../models/festivalDeals.js";

// Helper to get or create the singleton instance
const getOrCreateConfig = async () => {
  let config = await FestivalDealsSection.findOne();
  if (!config) {
    config = await FestivalDealsSection.create({});
  }
  return config;
};

// GET /festival-deals
export const getSection = async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    // Sort cards by sortOrder
    config.cards.sort((a, b) => a.sortOrder - b.sortOrder);
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Error fetching festival deals section", error: error.message });
  }
};

// POST /festival-deals (Initialize or Overwrite entire config - optional use)
export const createSection = async (req, res) => {
  try {
    let config = await FestivalDealsSection.findOne();
    if (config) {
      Object.assign(config, req.body);
      await config.save();
    } else {
      config = await FestivalDealsSection.create(req.body);
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Error creating section", error: error.message });
  }
};

// PUT /festival-deals (Update main config like title, viewAll)
export const updateSection = async (req, res) => {
  try {
    const { title, viewAll, isEnabled } = req.body;
    const config = await getOrCreateConfig();
    
    if (title !== undefined) config.title = title;
    if (viewAll !== undefined) config.viewAll = viewAll;
    if (isEnabled !== undefined) config.isEnabled = isEnabled;
    
    await config.save();
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Error updating section", error: error.message });
  }
};

// PUT /festival-deals/status
export const updateStatus = async (req, res) => {
  try {
    const { isEnabled } = req.body;
    const config = await getOrCreateConfig();
    config.isEnabled = isEnabled;
    await config.save();
    res.json({ success: true, isEnabled: config.isEnabled });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error: error.message });
  }
};

// DELETE /festival-deals (Reset config)
export const deleteSection = async (req, res) => {
  try {
    await FestivalDealsSection.deleteMany({});
    res.json({ message: "Section reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting section", error: error.message });
  }
};

// --- Card Operations ---

// POST /festival-deals/cards
export const addCard = async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    const newCard = req.body;
    // Auto set sortOrder to be at the end
    const maxOrder = config.cards.length > 0 ? Math.max(...config.cards.map(c => c.sortOrder)) : 0;
    newCard.sortOrder = maxOrder + 1;
    
    config.cards.push(newCard);
    await config.save();
    
    // Return the newly added card (it will have an _id now)
    const addedCard = config.cards[config.cards.length - 1];
    res.json(addedCard);
  } catch (error) {
    res.status(500).json({ message: "Error adding card", error: error.message });
  }
};

// PUT /festival-deals/cards/:id
export const updateCard = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getOrCreateConfig();
    
    const card = config.cards.id(id);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }
    
    // Update fields
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      card[key] = updates[key];
    });
    
    await config.save();
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: "Error updating card", error: error.message });
  }
};

// DELETE /festival-deals/cards/:id
export const deleteCard = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await getOrCreateConfig();
    
    const initialLength = config.cards.length;
    config.cards = config.cards.filter(c => c._id.toString() !== id);
    
    if (config.cards.length === initialLength) {
      return res.status(404).json({ message: "Card not found" });
    }
    
    await config.save();
    res.json({ success: true, message: "Card deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting card", error: error.message });
  }
};

// PUT /festival-deals/reorder
export const reorderCards = async (req, res) => {
  try {
    const { orderedIds } = req.body; // Array of card IDs in the new order
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ message: "Invalid request, expected orderedIds array" });
    }
    
    const config = await getOrCreateConfig();
    
    // Update sortOrder for each card based on its index in orderedIds
    orderedIds.forEach((id, index) => {
      const card = config.cards.id(id);
      if (card) {
        card.sortOrder = index;
      }
    });
    
    await config.save();
    config.cards.sort((a, b) => a.sortOrder - b.sortOrder);
    res.json({ success: true, cards: config.cards });
  } catch (error) {
    res.status(500).json({ message: "Error reordering cards", error: error.message });
  }
};
