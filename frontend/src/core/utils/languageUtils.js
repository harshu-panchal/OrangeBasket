export const normalizeLanguageCode = (code) => {
  if (!code) return 'en';
  const base = code.split('-')[0].toLowerCase();
  return base;
};

export const denormalizeLanguageCode = (code) => {
  return code;
};
