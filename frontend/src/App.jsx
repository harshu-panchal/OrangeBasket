import { Suspense, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import AppRouter from '@core/routes/AppRouter';
import { AuthProvider } from '@core/context/AuthContext';
import { SettingsProvider } from '@core/context/SettingsContext';
import { SupportUnreadProvider } from '@core/context/SupportUnreadContext';
import { LanguageProvider } from '@core/context/LanguageContext';
import SeoHead from '@core/components/SeoHead';
import { ToastProvider } from './shared/components/ui/Toast';
import Loader from './shared/components/ui/Loader';
import ErrorBoundary from './shared/components/ErrorBoundary';
import LenisScroll from './shared/components/LenisScroll';
import SplashScreen from './shared/components/ui/SplashScreen';

function App() {
    useEffect(() => {
        // Setup hardware back button listener for Android apps
        const setupBackButton = async () => {
            try {
                await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
                    if (canGoBack) {
                        window.history.back();
                    } else {
                        CapacitorApp.exitApp();
                    }
                });
            } catch (err) {
                // Ignore errors if running in a standard web browser (not capacitor)
            }
        };
        setupBackButton();
        
        return () => {
            try {
                CapacitorApp.removeAllListeners();
            } catch (err) {}
        };
    }, []);

    return (
        <ErrorBoundary>
            <AuthProvider>
                <LanguageProvider>
                    <SettingsProvider>
                        <SeoHead />
                        <ToastProvider>
                            <Suspense fallback={<Loader fullScreen />}>
                                <SupportUnreadProvider>
                                    <LenisScroll />
                                    <SplashScreen>
                                        <AppRouter />
                                    </SplashScreen>
                                </SupportUnreadProvider>
                            </Suspense>
                        </ToastProvider>
                    </SettingsProvider>
                </LanguageProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
