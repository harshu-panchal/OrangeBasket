import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Smartphone, Moon, Globe, ChevronRight } from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { toast } from "sonner";
import { useTranslation } from "@core/context/LanguageContext";

const Settings = () => {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailAlerts: false,
    sound: true,
    vibration: true,
    darkMode: false,
  });

  const { t, language, setLanguage, languages } = useTranslation();
  const [isLangExpanded, setIsLangExpanded] = useState(false);
  const [draftLanguage, setDraftLanguage] = useState(language);

  useEffect(() => {
    if (isLangExpanded) {
      setDraftLanguage(language);
    }
  }, [isLangExpanded, language]);

  const toggleSetting = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success(t('settingsUpdated') || "Settings updated");
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-2"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="ds-h3 text-gray-900">{t('appSettings') || "App Settings"}</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Notifications */}
        <section>
          <h2 className="text-sm uppercase font-bold text-gray-500 mb-3 tracking-wider ml-1">{t('notificationsCap') || "Notifications"}</h2>
          <Card className="divide-y divide-gray-100">
            <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleSetting('pushNotifications')}>
              <div className="flex items-center">
                <Bell size={20} className="text-gray-400 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-800">{t('pushNotifications') || "Push Notifications"}</h4>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${settings.pushNotifications ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${settings.pushNotifications ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>
            
            <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleSetting('sound')}>
              <div className="flex items-center">
                <Smartphone size={20} className="text-gray-400 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-800">{t('soundVibration') || "Sound & Vibration"}</h4>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${settings.sound ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${settings.sound ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>
          </Card>
        </section>

        {/* General */}
        <section>
          <h2 className="text-sm uppercase font-bold text-gray-500 mb-3 tracking-wider ml-1">{t('generalCap') || "General"}</h2>
          <Card className="divide-y divide-gray-100">
            <div>
              <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setIsLangExpanded(!isLangExpanded)}>
                <div className="flex items-center">
                  <Globe size={20} className="text-gray-400 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-800">{t('language') || "Language"}</h4>
                    <p className="text-xs text-gray-500">
                      {languages.find(l => l.code === language)?.flag} {languages.find(l => l.code === language)?.name}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className={`text-gray-300 transition-all ${isLangExpanded ? "rotate-90" : ""}`} />
              </div>
              
              {isLangExpanded && (
                  <div className="bg-slate-50/50 border-t border-slate-100/60 divide-y divide-slate-100/60 transition-all duration-300">
                      {languages.map((lang) => (
                          <button
                              key={lang.code}
                              type="button"
                              onClick={() => setDraftLanguage(lang.code)}
                              className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-100/40 transition-colors text-left"
                          >
                              <div className="flex items-center gap-3">
                                  <span className="text-lg leading-none">{lang.flag}</span>
                                  <span className={`text-xs font-bold transition-colors ${
                                      draftLanguage === lang.code ? 'text-orange-500' : 'text-slate-600'
                                  }`}>
                                      {lang.name}
                                  </span>
                              </div>
                              {draftLanguage === lang.code && (
                                  <div className="w-2 h-2 rounded-full bg-orange-500 shadow-xs" />
                              )}
                          </button>
                      ))}
                      <div className="p-4 border-t border-slate-100/60 bg-white rounded-b-xl">
                        <Button 
                          className="w-full text-sm font-bold bg-primary text-white py-2 rounded-xl"
                          onClick={() => {
                            setLanguage(draftLanguage);
                            setIsLangExpanded(false);
                            toast.success(t('languageUpdated') || "Language updated");
                          }}
                        >
                          {t('save') || "Save"}
                        </Button>
                      </div>
                  </div>
              )}
            </div>

            <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleSetting('darkMode')}>
              <div className="flex items-center">
                <Moon size={20} className="text-gray-400 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-800">{t('darkMode') || "Dark Mode"}</h4>
                  <p className="text-xs text-gray-500">{t('darkModeDesc') || "Easier on the eyes at night"}</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${settings.darkMode ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${settings.darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>
          </Card>
        </section>

        <div className="text-center pt-8">
          <Button variant="ghost" className="text-gray-500 hover:bg-gray-50 hover:text-gray-600">
            {t('clearCache') || "Clear Cache (45 MB)"}
          </Button>
          <p className="text-xs text-gray-400 mt-2">{t('appVersion') || "App Version 1.2.0 (Build 450)"}</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
