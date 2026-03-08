import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { searchUsers } from '../api/search.api';
import type { SearchUser } from '../api/search.api';

const API_URL = 'http://localhost:4000';

export default function NewGroupPage() {
  const { sessionToken } = useAuthStore();
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  // Search users
  useEffect(() => {
    const performSearch = async () => {
      if (!sessionToken || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const results = await searchUsers(sessionToken, searchQuery);
        // Filter out already selected members
        const filtered = results.filter(
          (user) => !selectedMembers.find((m) => m.userId === user.userId)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, sessionToken, selectedMembers]);

  // Add member
  const handleAddMember = (user: SearchUser) => {
    setSelectedMembers([...selectedMembers, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Remove member
  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter((m) => m.userId !== userId));
  };

  // Create group
  const handleCreateGroup = async () => {
    if (!sessionToken || !groupName.trim() || selectedMembers.length === 0) {
      alert('Please enter group name and add at least one member');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/groups/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim(),
          memberIds: selectedMembers.map((m) => m.userId),
        }),
      });

      if (response.ok) {
        const group = await response.json();
        console.log('Group created:', group);
        navigate('/');
      } else {
        const error = await response.json();
        alert(error.error?.message || 'Failed to create group');
      }
    } catch (error) {
      console.error('Create group error:', error);
      alert('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const getInitials = (displayName: string, firstName?: string, lastName?: string) => {
    const first = firstName || displayName || '';
    const last = lastName || '';
    if (first && last) {
      return (first[0] + last[0]).toUpperCase();
    } else if (first) {
      return first.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">New Group</h1>
          </div>
          <button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedMembers.length === 0 || creating}
            className="px-6 py-2 bg-telegram-blue text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Group Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                maxLength={64}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Enter group description"
                maxLength={200}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue resize-none"
              />
            </div>
          </div>
        </div>

        {/* Selected Members */}
        {selectedMembers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Members ({selectedMembers.length})
            </h2>
            <div className="space-y-2">
              {selectedMembers.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-telegram-blue flex items-center justify-center text-white font-bold">
                      {member.profilePhotoUrl ? (
                        <img
                          src={member.profilePhotoUrl}
                          alt={member.displayName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(member.displayName, member.firstName, member.lastName)
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.displayName}</p>
                      {member.username && (
                        <p className="text-sm text-gray-500">@{member.username}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Members */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Members</h2>
          
          {/* Search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searching && (
              <div className="absolute right-3 top-2.5">
                <div className="w-5 h-5 border-2 border-telegram-blue border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="space-y-2">
              {searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <button
                    key={user.userId}
                    onClick={() => handleAddMember(user)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-telegram-blue flex items-center justify-center text-white font-bold">
                      {user.profilePhotoUrl ? (
                        <img
                          src={user.profilePhotoUrl}
                          alt={user.displayName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(user.displayName, user.firstName, user.lastName)
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{user.displayName}</p>
                      {user.username && (
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-telegram-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No users found</p>
              )}
            </div>
          )}

          {searchQuery.length < 2 && (
            <p className="text-center text-gray-500 py-4">
              Type at least 2 characters to search
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
