import apiClient from "../../../core/api/axios";

export const getFestivalDeals = async () => {
  const response = await apiClient.get("/festival-deals");
  return response.data;
};

export const createFestivalDeals = async (data) => {
  const response = await apiClient.post("/festival-deals", data);
  return response.data;
};

export const updateFestivalDeals = async (data) => {
  const response = await apiClient.put("/festival-deals", data);
  return response.data;
};

export const updateFestivalDealsStatus = async (isEnabled) => {
  const response = await apiClient.put("/festival-deals/status", { isEnabled });
  return response.data;
};

export const deleteFestivalDeals = async () => {
  const response = await apiClient.delete("/festival-deals");
  return response.data;
};

export const addCard = async (cardData) => {
  const response = await apiClient.post("/festival-deals/cards", cardData);
  return response.data;
};

export const updateCard = async (cardId, cardData) => {
  const response = await apiClient.put(`/festival-deals/cards/${cardId}`, cardData);
  return response.data;
};

export const deleteCard = async (cardId) => {
  const response = await apiClient.delete(`/festival-deals/cards/${cardId}`);
  return response.data;
};

export const reorderCards = async (orderedIds) => {
  const response = await apiClient.put("/festival-deals/reorder", { orderedIds });
  return response.data;
};
