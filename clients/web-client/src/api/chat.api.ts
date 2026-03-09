const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface Chat {
  chatId: string;
  type: 'private' | 'group';
  // Private chat fields
  participant?: {
    userId: string;
    displayName: string;
    firstName: string;
    lastName: string;
    username: string;
    profilePhotoUrl: string;
    bio: string;
    isOnline: boolean;
    lastSeen: Date;
  };
  // Group chat fields
  groupName?: string;
  groupDescription?: string;
  groupPhotoUrl?: string;
  memberCount?: number;
  onlineCount?: number;
  isAdmin?: boolean;
  // Common fields
  lastMessage: {
    text: string;
    timestamp: Date;
  } | null;
  updatedAt: Date;
  unreadCount?: number;
}

export interface Message {
  messageId: string;
  chatId: string;
  senderId: string;
  messageType?: 'text' | 'image' | 'video' | 'voice' | 'file';
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  voiceUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  timestamp: Date;
  isRead: boolean;
}

export const createChat = async (token: string, participantId: string): Promise<Chat> => {
  const response = await fetch(`${API_URL}/api/v1/chats/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ participantId }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Create chat error:', error);
    throw new Error(error.error?.message || 'Failed to create chat');
  }

  return response.json();
};

export const getMyChats = async (token: string): Promise<Chat[]> => {
  const response = await fetch(`${API_URL}/api/v1/chats/my`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get chats');
  }

  const data = await response.json();
  return data.chats;
};

export const sendMessage = async (token: string, chatId: string, text: string): Promise<Message> => {
  const response = await fetch(`${API_URL}/api/v1/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ chatId, text }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
};

export const getMessages = async (token: string, chatId: string): Promise<Message[]> => {
  const response = await fetch(`${API_URL}/api/v1/messages/${chatId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get messages');
  }

  const data = await response.json();
  return data.messages;
};

export const markMessagesAsRead = async (token: string, chatId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api/v1/messages/${chatId}/mark-read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to mark messages as read');
  }
};

export const sendImage = async (token: string, chatId: string, image: File): Promise<Message> => {
  const formData = new FormData();
  formData.append('chatId', chatId);
  formData.append('image', image);

  const response = await fetch(`${API_URL}/api/v1/messages/send-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to send image');
  }

  return response.json();
};

export const sendVideo = async (token: string, chatId: string, video: File): Promise<Message> => {
  const formData = new FormData();
  formData.append('chatId', chatId);
  formData.append('video', video);

  const response = await fetch(`${API_URL}/api/v1/messages/send-video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to send video');
  }

  return response.json();
};

export const sendVoice = async (token: string, chatId: string, voice: Blob): Promise<Message> => {
  const formData = new FormData();
  formData.append('chatId', chatId);
  formData.append('voice', voice, 'voice.webm');

  const response = await fetch(`${API_URL}/api/v1/messages/send-voice`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to send voice message');
  }

  return response.json();
};

export const sendFile = async (token: string, chatId: string, file: File): Promise<Message> => {
  const formData = new FormData();
  formData.append('chatId', chatId);
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/v1/messages/send-file`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to send file');
  }

  return response.json();
};
