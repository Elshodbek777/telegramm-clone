import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface UserSettings {
  theme: 'light' | 'dark';
  notifications: {
    messageNotifications: boolean;
    soundEnabled: boolean;
    desktopNotifications: boolean;
  };
  privacy: {
    lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
    profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
  };
}

export default function SettingsPage() {
  const { sessionToken } = useAuthStore();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!sessionToken) return;

      try {
        const response = await fetch(`${API_URL}/api/v1/users/me/settings`, {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [sessionToken]);

  // Save settings
  const saveSettings = async (updatedSettings: UserSettings) => {
    if (!sessionToken) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/users/me/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(updatedSettings),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Handle theme change
  const handleThemeChange = (theme: 'light' | 'dark') => {
    if (!settings) return;
    const updated = { ...settings, theme };
    setSettings(updated);
    saveSettings(updated);
  };

  // Handle notification toggle
  const handleNotificationToggle = (key: keyof UserSettings['notifications']) => {
    if (!settings) return;
    const updated = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    };
    setSettings(updated);
    saveSettings(updated);
  };

  // Handle privacy change
  const handlePrivacyChange = (key: keyof UserSettings['privacy'], value: any) => {
    if (!settings) return;
    const updated = {
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: value,
      },
    };
    setSettings(updated);
    saveSettings(updated);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-telegram-blue"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Theme Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Theme</h2>
          <div className="space-y-3">
            <button
              onClick={() => handleThemeChange('light')}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                settings.theme === 'light'
                  ? 'border-telegram-blue bg-telegram-blue-light'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM11 1H13V4H11V1ZM11 20H13V23H11V20ZM3.51472 4.92893L4.92893 3.51472L7.05025 5.63604L5.63604 7.05025L3.51472 4.92893ZM16.9497 18.364L18.364 16.9497L20.4853 19.0711L19.0711 20.4853L16.9497 18.364ZM19.0711 3.51472L20.4853 4.92893L18.364 7.05025L16.9497 5.63604L19.0711 3.51472ZM5.63604 16.9497L7.05025 18.364L4.92893 20.4853L3.51472 19.0711L5.63604 16.9497ZM23 11V13H20V11H23ZM4 11V13H1V11H4Z" />
                </svg>
                <span className="font-medium text-gray-900">Light</span>
              </div>
              {settings.theme === 'light' && (
                <svg className="w-6 h-6 text-telegram-blue" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => handleThemeChange('dark')}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                settings.theme === 'dark'
                  ? 'border-telegram-blue bg-telegram-blue-light'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 7C10 10.866 13.134 14 17 14C18.9584 14 20.729 13.1957 21.9995 11.8995C22 11.933 22 11.9665 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C12.0335 2 12.067 2 12.1005 2.00049C10.8043 3.27098 10 5.04157 10 7ZM4 12C4 16.4183 7.58172 20 12 20C15.0583 20 17.7158 18.2839 19.062 15.7621C18.3945 15.9187 17.7035 16 17 16C12.0294 16 8 11.9706 8 7C8 6.29648 8.08133 5.60547 8.2379 4.938C5.71611 6.28423 4 8.9417 4 12Z" />
                </svg>
                <span className="font-medium text-gray-900">Dark</span>
              </div>
              {settings.theme === 'dark' && (
                <svg className="w-6 h-6 text-telegram-blue" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Message Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications for new messages</p>
              </div>
              <button
                onClick={() => handleNotificationToggle('messageNotifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.messageNotifications ? 'bg-telegram-blue' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.messageNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Sound</p>
                <p className="text-sm text-gray-500">Play sound for notifications</p>
              </div>
              <button
                onClick={() => handleNotificationToggle('soundEnabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.soundEnabled ? 'bg-telegram-blue' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Desktop Notifications</p>
                <p className="text-sm text-gray-500">Show desktop notifications</p>
              </div>
              <button
                onClick={() => handleNotificationToggle('desktopNotifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.desktopNotifications ? 'bg-telegram-blue' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.desktopNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy</h2>
          <div className="space-y-6">
            <div>
              <p className="font-medium text-gray-900 mb-2">Last Seen</p>
              <p className="text-sm text-gray-500 mb-3">Who can see your last seen time</p>
              <div className="space-y-2">
                {['everyone', 'contacts', 'nobody'].map((option) => (
                  <button
                    key={option}
                    onClick={() => handlePrivacyChange('lastSeenVisibility', option)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      settings.privacy.lastSeenVisibility === option
                        ? 'border-telegram-blue bg-telegram-blue-light'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="capitalize text-gray-900">{option}</span>
                    {settings.privacy.lastSeenVisibility === option && (
                      <svg className="w-5 h-5 text-telegram-blue" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-900 mb-2">Profile Photo</p>
              <p className="text-sm text-gray-500 mb-3">Who can see your profile photo</p>
              <div className="space-y-2">
                {['everyone', 'contacts', 'nobody'].map((option) => (
                  <button
                    key={option}
                    onClick={() => handlePrivacyChange('profilePhotoVisibility', option)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      settings.privacy.profilePhotoVisibility === option
                        ? 'border-telegram-blue bg-telegram-blue-light'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="capitalize text-gray-900">{option}</span>
                    {settings.privacy.profilePhotoVisibility === option && (
                      <svg className="w-5 h-5 text-telegram-blue" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Read Receipts</p>
                <p className="text-sm text-gray-500">Show double check marks when messages are read</p>
              </div>
              <button
                onClick={() => handlePrivacyChange('readReceipts', !settings.privacy.readReceipts)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.privacy.readReceipts ? 'bg-telegram-blue' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.privacy.readReceipts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {saving && (
          <div className="fixed bottom-4 right-4 bg-telegram-blue text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Saving...</span>
          </div>
        )}
      </div>
    </div>
  );
}
