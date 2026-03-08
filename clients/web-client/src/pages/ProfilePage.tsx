import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getProfile, updateProfile, uploadProfilePhoto } from '../api/profile.api';
import type { UserProfile } from '../api/profile.api';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, sessionToken, setAuth } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [formData, setFormData] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    username: '',
    bio: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!sessionToken) return;
    
    try {
      const data = await getProfile(sessionToken);
      setProfile(data);
      setFormData({
        displayName: data.displayName || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        username: data.username || '',
        bio: data.bio || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSave = async () => {
    if (!sessionToken) return;

    setSaving(true);
    try {
      const updated = await updateProfile(sessionToken, formData);
      setProfile(updated);
      
      // Update auth store with all profile data
      if (user) {
        setAuth({ 
          ...user, 
          displayName: updated.displayName,
          firstName: updated.firstName,
          lastName: updated.lastName,
          username: updated.username,
          bio: updated.bio,
        }, sessionToken);
      }
      
      showToastMessage('Profile updated successfully!');
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Failed to update profile:', error);
      showToastMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionToken) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      showToastMessage('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToastMessage('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const updated = await uploadProfilePhoto(sessionToken, file);
      setProfile(updated);
      
      // Update auth store with new profile photo
      if (user) {
        setAuth({ 
          ...user, 
          displayName: updated.displayName,
          firstName: updated.firstName,
          lastName: updated.lastName,
          username: updated.username,
          bio: updated.bio,
          profilePhotoUrl: updated.profilePhotoUrl, // Add profile photo URL
        }, sessionToken);
      }
      
      showToastMessage('Profile photo updated!');
    } catch (error) {
      console.error('Failed to upload photo:', error);
      showToastMessage('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-telegram-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const photoUrl = profile?.profilePhotoUrl 
    ? `http://localhost:4000${profile.profilePhotoUrl}`
    : null;

  // Get initials from firstName and lastName
  const getInitials = () => {
    const first = formData.firstName?.trim() || profile?.displayName?.trim() || '';
    const last = formData.lastName?.trim() || '';
    
    if (first && last) {
      return (first[0] + last[0]).toUpperCase();
    } else if (first) {
      return first.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg">
            {toastMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-telegram-blue hover:text-telegram-blue-dark transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-xl font-semibold">Edit Profile</h1>
          <div className="w-20"></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Profile Photo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div
                onClick={handlePhotoClick}
                className="w-32 h-32 rounded-full bg-telegram-blue flex items-center justify-center text-white text-4xl font-bold cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  getInitials()
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <button
              onClick={handlePhotoClick}
              disabled={uploading}
              className="mt-4 text-telegram-blue hover:text-telegram-blue-dark font-medium transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Change Photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue"
                placeholder="Your display name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue"
                  placeholder="First name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue"
                placeholder="@username"
              />
              <p className="mt-1 text-sm text-gray-500">
                You can choose a username on Telegram. If you do, people will be able to find you by this username.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue resize-none"
                placeholder="Any details about you"
              />
            </div>

            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !formData.displayName.trim()}
                className="w-full py-3 bg-telegram-blue text-white rounded-lg font-medium hover:bg-telegram-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="space-y-2 text-sm text-gray-600">
              <p>📱 Phone: {profile?.phoneNumber}</p>
              <p>🆔 User ID: {profile?.userId}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
