import React, { createContext, useContext } from 'react';

const WarehouseOrdersContext = createContext({
  orders: [],
  ordersLoading: false,
  refreshOrders: () => {},
});

export const useWarehouseOrders = () => useContext(WarehouseOrdersContext);
export default WarehouseOrdersContext;
