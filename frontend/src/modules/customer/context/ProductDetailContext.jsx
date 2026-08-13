import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { customerApi } from '../services/customerApi';
import { useLocation as useAppLocation } from './LocationContext';

const ProductDetailContext = createContext();

export const useProductDetail = () => {
    const context = useContext(ProductDetailContext);
    if (!context) {
        // console.warn('useProductDetail used outside Provider');
        return {};
    }
    return context;
};

export const ProductDetailProvider = ({ children }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
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
                
                customerApi.getProductById(productParam, params)
                    .then(res => {
                        if (res.data.success) {
                            setSelectedProduct(res.data.result || res.data.results || res.data);
                            setIsOpen(true);
                        }
                    })
                    .catch(err => {
                        console.error("Failed to fetch product from URL", err);
                        setSearchParams(prev => { prev.delete('product'); return prev; }, { replace: true });
                    });
            }
        } else if (!productParam && isOpen) {
            setIsOpen(false);
            setTimeout(() => setSelectedProduct(null), 300);
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
        setTimeout(() => setSelectedProduct(null), 300);
        setSearchParams((prev) => {
            prev.delete('product');
            return prev;
        }, { replace: true });
    };

    const value = useMemo(
        () => ({ selectedProduct, isOpen, openProduct, closeProduct }),
        [selectedProduct, isOpen]
    );

    return (
        <ProductDetailContext.Provider value={value}>
            {children}
        </ProductDetailContext.Provider>
    );
};
