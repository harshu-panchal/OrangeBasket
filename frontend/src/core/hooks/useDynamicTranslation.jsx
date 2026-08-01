import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import * as transService from '../services/translationService';

export const useDynamicTranslation = (options = {}) => {
  const { language } = useTranslation();
  const [isTranslating, setIsTranslating] = useState(false);
  const defaultSourceLang = options.sourceLang || 'en';

  const translate = async (text, sourceLang = defaultSourceLang) => {
    setIsTranslating(true);
    try {
      return await transService.translateText(text, language, sourceLang);
    } finally {
      setIsTranslating(false);
    }
  };

  const translateBatch = async (texts, sourceLang = defaultSourceLang) => {
    setIsTranslating(true);
    try {
      return await transService.translateBatch(texts, language, sourceLang);
    } finally {
      setIsTranslating(false);
    }
  };

  const translateObject = async (obj, keysToTranslate = [], sourceLang = defaultSourceLang) => {
    setIsTranslating(true);
    try {
      return await transService.translateObject(obj, language, sourceLang, keysToTranslate);
    } finally {
      setIsTranslating(false);
    }
  };

  return {
    translate,
    translateBatch,
    translateObject,
    isTranslating
  };
};
