import * as translationService from '../services/translationService.js';

export const translateSingle = async (req, res, next) => {
  try {
    const { text, targetLang, sourceLang = 'en' } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text parameter is required' });
    }
    if (!targetLang) {
      return res.status(400).json({ success: false, error: 'Target language is required' });
    }

    const translation = await translationService.translateText(text, targetLang, sourceLang);
    return res.status(200).json({
      success: true,
      data: {
        original: text,
        translation,
        sourceLang,
        targetLang
      }
    });
  } catch (error) {
    next(error);
  }
};

export const translateBatchRoute = async (req, res, next) => {
  try {
    const { texts, targetLang, sourceLang = 'en' } = req.body;
    if (!Array.isArray(texts)) {
      return res.status(400).json({ success: false, error: 'Texts parameter must be an array' });
    }
    if (texts.length > 100) {
      return res.status(400).json({ success: false, error: 'Maximum batch size is 100' });
    }
    if (!targetLang) {
      return res.status(400).json({ success: false, error: 'Target language is required' });
    }

    const translations = await translationService.translateBatch(texts, targetLang, sourceLang);
    return res.status(200).json({
      success: true,
      data: {
        original: texts,
        translations,
        sourceLang,
        targetLang
      }
    });
  } catch (error) {
    next(error);
  }
};

export const translateObjectRoute = async (req, res, next) => {
  try {
    const { obj, targetLang, sourceLang = 'en', keysToTranslate = [] } = req.body;
    if (!obj || typeof obj !== 'object') {
      return res.status(400).json({ success: false, error: 'Object parameter is required' });
    }
    if (!targetLang) {
      return res.status(400).json({ success: false, error: 'Target language is required' });
    }

    const translatedObj = await translationService.translateObject(obj, targetLang, sourceLang, keysToTranslate);
    return res.status(200).json({
      success: true,
      data: {
        translation: translatedObj,
        sourceLang,
        targetLang
      }
    });
  } catch (error) {
    next(error);
  }
};
