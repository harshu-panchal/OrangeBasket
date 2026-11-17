import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useProductDetail } from '../../context/ProductDetailContext';
import ViewCartPill from './ViewCartPill';

const DESKTOP_QUERY = '(min-width: 768px)';

// Desktop/website "View cart" pill. On mobile the same pill lives in the BottomNav.
// Rendered only on desktop so there's a single #mini-cart-target in the DOM.
const MiniCart = () => {
    const { cartCount } = useCart();
    const { isOpen: isProductDetailOpen } = useProductDetail();
    const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);

    useEffect(() => {
        const mq = window.matchMedia(DESKTOP_QUERY);
        const onChange = (e) => setIsDesktop(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const visible = isDesktop && cartCount > 0 && !isProductDetailOpen;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: 40, opacity: 0, x: '-50%' }}
                    animate={{ y: 0, opacity: 1, x: '-50%' }}
                    exit={{ y: 40, opacity: 0, x: '-50%' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed left-1/2 bottom-8 z-[510]"
                >
                    <ViewCartPill />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MiniCart;
