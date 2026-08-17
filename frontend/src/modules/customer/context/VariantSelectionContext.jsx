import React, { createContext, useContext, useState, useMemo } from 'react';

const VariantSelectionContext = createContext();

export const useVariantSelection = () => {
    const context = useContext(VariantSelectionContext);
    if (!context) {
        return {};
    }
    return context;
};

export const VariantSelectionProvider = ({ children }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    const openVariantSelection = (product) => {
        setSelectedProduct(product);
        setIsOpen(true);
    };

    const closeVariantSelection = () => {
        setIsOpen(false);
        setTimeout(() => setSelectedProduct(null), 300); // Wait for exit animation
    };

    const value = useMemo(
        () => ({ selectedProduct, isOpen, openVariantSelection, closeVariantSelection }),
        [selectedProduct, isOpen]
    );

    return (
        <VariantSelectionContext.Provider value={value}>
            {children}
        </VariantSelectionContext.Provider>
    );
};
