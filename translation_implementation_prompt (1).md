# 🌐 Dynamic Translation System - Implementation Prompt

**Copy and paste this entire prompt to AI assistant to implement dynamic translation feature**

---

## OBJECTIVE

Implement a **production-ready, dynamic translation system** with zero static translation files. All content (static UI text and dynamic API data) should be translated in real-time using Google Cloud Translate API.

## TECH STACK

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Translation API**: Google Cloud Translate
- **Caching**: IndexedDB (primary) + localStorage (fallback)
- **RTL Support**: Required for languages like Arabic, Hebrew, Urdu

## REQUIREMENTS

### ✅ Must Have Features

1. **Automatic Language Detection**: Integrate with existing language selector dropdown
2. **Dynamic Translation**: Translate ALL text dynamically at runtime (no static i18n JSON files)
3. **Multi-layer Caching**: 
   - IndexedDB for browser-side caching (50MB limit, 24-hour TTL)
   - localStorage fallback
   - Backend in-memory cache (24-hour TTL)
4. **Batch Processing**: Automatically batch similar translation requests to reduce API calls by 80-90%
5. **Rate Limiting**: Queue management to prevent API quota exhaustion
6. **RTL Support**: Auto-detect and set `dir="rtl"` for RTL languages
7. **Error Handling**: Graceful fallback to original text on API failures
8. **Performance Optimization**: 
   - Request debouncing and queuing
   - Cache-first strategy
   - Exponential backoff for rate limits

### 🎯 Translation Capabilities

Must support translating:
- Static UI text (buttons, labels, headings, paragraphs)
- Dynamic API responses (product names, descriptions, user-generated content)
- Nested objects and arrays
- Selective key translation in objects

## IMPLEMENTATION STEPS

### PHASE 1: BACKEND SETUP

1. **Install Dependencies**:
   ```bash
   npm install @google-cloud/translate dotenv
   ```

2. **Create Translation Infrastructure**:
   - `backend/src/config/googleCloud.js` - Google Cloud Translate client initialization with API key support
   - `backend/src/services/translationService.js` - Core translation logic with:
     - `translateText(text, targetLang, sourceLang)` - Single text translation
     - `translateBatch(texts[], targetLang, sourceLang)` - Batch translation
     - `translateObject(obj, targetLang, sourceLang, keysToTranslate)` - Object translation
   - In-memory cache with 24-hour TTL and automatic cleanup
   - Retry logic with exponential backoff (3 retries: 1s, 2s, 4s delays)

3. **Create API Endpoints**:
   - `POST /api/v1/translate` - Single text translation
   - `POST /api/v1/translate/batch` - Batch translation (max 100 texts)
   - `POST /api/v1/translate/object` - Object property translation
   - All endpoints should be **public** (no auth required)
   - Return format: `{ success: true, data: { original, translation, sourceLang, targetLang } }`

4. **Error Handling**:
   - Return 429 for rate limits with `retryAfter` header
   - Return 400 for validation errors
   - Log critical errors with context
   - Never cache translations that equal original text

5. **Environment Variables**:
   ```env
   GOOGLE_CLOUD_TRANSLATE_API_KEY=your_api_key_here
   ```

### PHASE 2: FRONTEND SETUP

1. **Create Core Services**:
   - `frontend/src/services/translationService.js`:
     - API client with request queuing and batching
     - Collect requests within 100ms window and batch up to 10 texts
     - Min 200ms interval between requests
     - Export: `translateText()`, `translateBatch()`, `translateObject()`
   
   - `frontend/src/utils/translationCache.js`:
     - IndexedDB primary storage (50MB, 24h TTL)
     - localStorage fallback
     - Auto-cleanup expired entries
     - Reject cache where translation === original text

2. **Create Language Management**:
   - `frontend/src/contexts/LanguageContext.jsx`:
     - Global state for current language
     - Persist selection to localStorage
     - Auto-update `document.dir` for RTL languages
     - Provide `{ language, languages, changeLanguage, isChangingLanguage }`
   
   - `frontend/src/utils/languageUtils.js`:
     - `normalizeLanguageCode()` - Convert locale codes to API codes
     - `denormalizeLanguageCode()` - Convert API codes back

3. **Create React Hooks**:
   
   **a) `useDynamicTranslation`** - For API/dynamic content:
   ```jsx
   const { translate, translateBatch, translateObject, isTranslating } 
     = useDynamicTranslation({ sourceLang: 'en' });
   
   // Usage:
   const translated = await translate("Hello");
   const translatedArray = await translateBatch(["text1", "text2"]);
   const translatedObj = await translateObject({ title: "Hi" }, ['title']);
   ```
   
   **b) `usePageTranslation`** - For static page content (better performance):
   ```jsx
   const staticTexts = ["Home", "About", "Contact"];
   const { getTranslatedText, isTranslating } = usePageTranslation(staticTexts);
   
   // Usage:
   const translated = getTranslatedText("Home");
   ```

4. **Create UI Components** (Optional but recommended):
   - `<TranslatedText>` - Wrapper for individual text strings
   - `<AutoTranslated>` - Auto-translate children
   - `<TranslatedContent>` - For objects/arrays

### PHASE 3: INTEGRATION

1. **Wrap App with LanguageProvider**:
   ```jsx
   import { LanguageProvider } from './contexts/LanguageContext';
   
   <LanguageProvider>
     <App />
   </LanguageProvider>
   ```

2. **Connect Existing Language Selector**:
   ```jsx
   const { language, languages, changeLanguage } = useLanguage();
   
   // In your existing dropdown:
   <select value={language} onChange={(e) => changeLanguage(e.target.value)}>
     {Object.entries(languages).map(([code, { label }]) => (
       <option key={code} value={code}>{label}</option>
     ))}
   </select>
   ```

3. **Language Configuration**:
   - Extract language codes from existing dropdown
   - Map them in `languageCodeMap` in both:
     - `backend/src/config/googleCloud.js`
     - `frontend/src/utils/languageUtils.js`
   - Define RTL languages: `["ar", "he", "ur", "fa"]`

## USAGE EXAMPLES

### Example 1: Static Page Content
```jsx
function HomePage() {
  const texts = ["Welcome to our site", "Learn more", "Get started"];
  const { getTranslatedText } = usePageTranslation(texts);
  
  return (
    <div>
      <h1>{getTranslatedText("Welcome to our site")}</h1>
      <button>{getTranslatedText("Get started")}</button>
    </div>
  );
}
```

### Example 2: API Response Translation
```jsx
function ProductList() {
  const [products, setProducts] = useState([]);
  const { translateObject } = useDynamicTranslation();
  
  useEffect(() => {
    fetch('/api/products').then(async (res) => {
      const data = await res.json();
      const translated = await Promise.all(
        data.map(product => translateObject(product, ['name', 'description']))
      );
      setProducts(translated);
    });
  }, []);
}
```

### Example 3: User-Generated Content
```jsx
function CommentsList({ comments }) {
  const { translate } = useDynamicTranslation();
  const [translatedComments, setTranslatedComments] = useState([]);
  
  useEffect(() => {
    Promise.all(comments.map(c => translate(c.text)))
      .then(setTranslatedComments);
  }, [comments]);
  
  return translatedComments.map((text, i) => <p key={i}>{text}</p>);
}
```

## CONFIGURATION CHECKLIST

### Google Cloud Setup
- [ ] Create Google Cloud project
- [ ] Enable Cloud Translation API
- [ ] Create API Key with restrictions
- [ ] Add key to `backend/.env`: `GOOGLE_CLOUD_TRANSLATE_API_KEY=...`

### Language Setup
- [ ] Extract language codes from existing dropdown
- [ ] Update `languageCodeMap` in backend config
- [ ] Update `languageCodeMap` in frontend utils
- [ ] Define `languages` object in LanguageContext with flags/labels
- [ ] Specify RTL languages array

### Testing
- [ ] Create test script: `npm run test-translation`
- [ ] Test single translation
- [ ] Test batch translation
- [ ] Test all languages
- [ ] Verify caching works
- [ ] Test RTL layout switching

## KEY TECHNICAL DECISIONS

1. **Cache Key Format**: `{sourceLang}_{targetLang}_{base64(text)}`
2. **Batch Size**: Max 10 texts per batch (frontend), 100 texts (API limit)
3. **Rate Limiting**: 200ms minimum between requests
4. **Cache TTL**: 24 hours for all translations
5. **Retry Strategy**: Exponential backoff (1s, 2s, 4s) for rate limits
6. **Fallback Strategy**: Return original text on errors
7. **Queue Processing**: 100ms wait time to collect batchable requests

## PERFORMANCE TARGETS

- **Cache Hit Rate**: 70-80% after initial page load
- **API Call Reduction**: 85%+ through batching
- **Translation Latency**: 
  - Cached: <10ms
  - First-time: 100-300ms
  - Batch: ~500ms for 10 items
- **Storage**: <50MB IndexedDB usage

## IMPORTANT NOTES

⚠️ **Critical Requirements**:
1. Never cache translations where `translation === original` (indicates API failure)
2. Always normalize language codes before caching/API calls
3. Queue similar requests to maximize batching efficiency
4. Validate cache integrity on retrieval
5. Handle RTL automatically based on language code
6. Make translation endpoints public (skip auth)

✅ **Best Practices**:
1. Use `usePageTranslation` for static content (better batching)
2. Use `useDynamicTranslation` for API responses
3. Translate at component level, not app level
4. Don't translate empty strings or numbers
5. Cache aggressively, invalidate conservatively

## DELIVERABLES

Please implement the following files with complete, production-ready code:

### Backend (7 files)
1. `backend/src/config/googleCloud.js`
2. `backend/src/services/translationService.js`
3. `backend/src/controllers/translationController.js`
4. `backend/src/routes/translationRoutes.js`
5. `backend/scripts/testTranslation.js`
6. Update `backend/src/app.js` to register routes
7. Update `backend/.env` with environment variables

### Frontend (10 files)
1. `frontend/src/config/api.js`
2. `frontend/src/utils/languageUtils.js`
3. `frontend/src/utils/translationCache.js`
4. `frontend/src/services/api/baseClient.js`
5. `frontend/src/services/translationService.js`
6. `frontend/src/contexts/LanguageContext.jsx`
7. `frontend/src/hooks/useDynamicTranslation.jsx`
8. `frontend/src/hooks/usePageTranslation.jsx`
9. `frontend/src/components/TranslatedText.jsx` (optional)
10. Update `frontend/src/main.jsx` to add LanguageProvider

### Documentation
1. Setup instructions
2. Usage examples
3. Language configuration guide
4. Testing guide

## REFERENCE

This implementation is based on the Digital-AELA project's translation system, which successfully handles 10+ languages with 85%+ API call reduction through intelligent caching and batching.

---

**Ready to implement? Start with backend Phase 1, then frontend Phase 2, then integration Phase 3. Test thoroughly at each phase.**
