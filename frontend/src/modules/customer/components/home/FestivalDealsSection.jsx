import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { customerApi } from '../../services/customerApi';

const FestivalDealsSection = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await customerApi.getFestivalDeals();
        // getWithDedupe returns the raw axios response data usually or response? 
        // We added it directly to customerApi.js which uses getWithDedupe. 
        // Let's safely access data.
        const data = response?.data || response;
        if (data && data.isEnabled) {
          setConfig(data);
        }
      } catch (error) {
        console.error("Error fetching Festival Deals:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  if (loading || !config || !config.isEnabled || !config.cards || config.cards.length === 0) {
    return null;
  }

  const activeCards = config.cards.filter(c => c.isActive);
  if (activeCards.length === 0) return null;

  const handleCardClick = (card) => {
    if (!card.redirectUrl || card.redirectUrl.trim() === '') {
      console.warn("Festival Deals: No redirect URL configured for this card.");
      return;
    }
    
    window.scrollTo(0, 0);
    const url = card.redirectUrl.trim();

    // Defensive check: if the user accidentally pasted a full URL instead of an ID, just go there
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.location.href = url;
      return;
    }

    // Redirect logic based on type
    if (card.redirectType === 'category') {
      navigate(`/category/${url}`);
    } else if (card.redirectType === 'product') {
      navigate(`/product/${url}`);
    } else {
      // Custom relative URL
      navigate(url.startsWith('/') ? url : `/${url}`);
    }
  };

  return (
    <div className="py-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-4 md:px-0">
        <h2 className="text-[1.35rem] font-black text-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          {config.title || "Top Festival Deals"}
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        </h2>
        {config.viewAll?.enabled && (
          <button 
            onClick={() => navigate(config.viewAll.url || '/')}
            className="text-sm font-bold text-primary flex items-center hover:underline"
          >
            {config.viewAll.text || "View All"} <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex overflow-x-auto gap-4 px-4 md:px-0 pb-4 no-scrollbar snap-x">
        {activeCards.map((card) => (
          <div 
            key={card._id}
            onClick={(e) => { e.stopPropagation(); handleCardClick(card); }}
            className="flex-shrink-0 w-[140px] md:w-[160px] lg:w-[180px] snap-start rounded-[20px] p-3 flex flex-col cursor-pointer transition-transform hover:scale-[1.02] shadow-sm"
            style={{ backgroundColor: card.backgroundColor || '#FFF8E7' }}
          >
            {/* Card Heading */}
            <h3 
              className="text-center font-bold text-[13px] leading-tight mb-1 relative z-10"
              style={{ color: card.textColor || '#B45309' }}
            >
              {card.title}
            </h3>

            {/* Image */}
            <div className="h-[104px] flex items-center justify-center my-0.5 relative z-0">
              <img 
                src={card.image} 
                alt={card.title} 
                className="w-full h-full object-contain drop-shadow-md scale-110"
              />
            </div>

            {/* Offer Text */}
            <div 
              className="text-center mt-1.5 mb-2.5 leading-tight flex flex-col justify-end"
              style={{ color: card.textColor || '#B45309' }}
            >
              {card.offerText.includes('% OFF') ? (
                <>
                  <div className="text-[10px] font-bold opacity-80 leading-none">{card.offerText.split(/[0-9]+/)[0].trim()}</div>
                  <div className="font-black text-xl md:text-2xl mt-[-2px] leading-none">
                    {card.offerText.match(/[0-9]+% OFF/i)?.[0] || card.offerText.match(/[0-9]+\s*% off/i)?.[0] || card.offerText}
                  </div>
                </>
              ) : card.offerText.includes('STARTING AT') ? (
                <>
                  <div className="text-[10px] font-bold opacity-80 leading-none">STARTING AT</div>
                  <div className="font-black text-xl md:text-2xl mt-[-2px] leading-none">
                    {card.offerText.replace('STARTING AT', '').trim()}
                  </div>
                </>
              ) : (
                <div className="font-black text-lg leading-tight">{card.offerText}</div>
              )}
            </div>

            {/* Button */}
            <button 
              className="w-full py-2 rounded-lg text-[11px] font-black text-white shadow-sm mt-auto transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: card.buttonColor || '#D97706' }}
            >
              {card.buttonText || "SHOP NOW"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FestivalDealsSection;
