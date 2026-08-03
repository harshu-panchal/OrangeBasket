import { useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { translateBatch } from '../services/translationService';

export const usePageTranslation = (staticTexts = []) => {
  const { language } = useTranslation();
  const [translations, setTranslations] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);
  
  const textsStr = JSON.stringify(staticTexts);

  useEffect(() => {
    let isMounted = true;
    const texts = JSON.parse(textsStr);
    
    if (!texts || texts.length === 0 || language === 'en') {
      setTranslations({});
      return;
    }

    const fetchTranslations = async () => {
      setIsTranslating(true);
      try {
        const translatedArray = await translateBatch(texts, language, 'en');
        if (isMounted) {
          const dict = {};
          texts.forEach((text, idx) => {
            dict[text] = translatedArray[idx] || text;
          });
          setTranslations(dict);
        }
      } catch (err) {
        console.error('usePageTranslation error:', err);
      } finally {
        if (isMounted) {
          setIsTranslating(false);
        }
      }
    };

    fetchTranslations();

    return () => {
      isMounted = false;
    };
  }, [textsStr, language]);

  const getTranslatedText = (text) => {
    if (!text || typeof text !== 'string') return text;
    if (language === 'en') return text;
    return translations[text] || text;
  };

  return { getTranslatedText, isTranslating };
};
