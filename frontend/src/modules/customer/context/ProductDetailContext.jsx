import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { customerApi } from '../services/customerApi';
import { useLocation as useAppLocation } from './LocationContext';

const ProductDetailContext = createContext();

export const useProductDetail = () => {
    const context = useContext(ProductDetailContext);
    if (!context) {
        return {};
    }
    return context;
};

export const ProductDetailProvider = ({ children }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const { currentLocation } = useAppLocation();

    useEffect(() => {
        const productParam = searchParams.get('product');
        if (productParam) {
            const currentIdOrSlug = selectedProduct?.slug || selectedProduct?._id || selectedProduct?.id;
            if (currentIdOrSlug !== productParam) {
                const params = {};
                if (currentLocation?.latitude && currentLocation?.longitude) {
                    params.lat = currentLocation.latitude;
                    params.lng = currentLocation.longitude;
                }

                setIsLoading(true);
                setError(null);

                customerApi.getProductById(productParam, params)
                    .then(res => {
                        if (res.data.success) {
                            setSelectedProduct(res.data.result || res.data.results || res.data);
                            setIsOpen(true);
                            setError(null);
                        }
                    })
                    .catch(err => {
                        console.error("Failed to fetch product from URL", err);
                        setError(err.response?.data?.message || "Failed to load product");
                        setIsOpen(true); // Open sheet to show error state
                        setSelectedProduct(null);
                    })
                    .finally(() => {
                        setIsLoading(false);
                    });
            }
        } else if (!productParam && isOpen) {
            setIsOpen(false);
            setTimeout(() => {
                setSelectedProduct(null);
                setError(null);
            }, 300);
        }
    }, [searchParams.get('product'), currentLocation?.latitude, currentLocation?.longitude]);

    const openProduct = (product) => {
        setSelectedProduct(product);
        setIsOpen(true);
        if (product) {
            const idOrSlug = product.slug || product._id || product.id;
            setSearchParams((prev) => {
                prev.set('product', idOrSlug);
                return prev;
            }, { replace: false });
        }
    };

    const closeProduct = () => {
        setIsOpen(false);
        setTimeout(() => {
            setSelectedProduct(null);
            setError(null);
        }, 300);
        setSearchParams((prev) => {
            prev.delete('product');
            return prev;
        }, { replace: true });
    };

    const value = useMemo(
        () => ({ selectedProduct, isOpen, isLoading, error, openProduct, closeProduct }),
        [selectedProduct, isOpen, isLoading, error]
    );

    return (
        <ProductDetailContext.Provider value={value}>
            {children}
        </ProductDetailContext.Provider>
    );
};
