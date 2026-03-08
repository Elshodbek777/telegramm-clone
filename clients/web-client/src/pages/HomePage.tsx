import { useAuthStore } from '../store/authStore';

export default function HomePage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Telegram Clone!
            </h1>
            <p className="text-gray-600 mb-4">
              Phone: {user?.phoneNumber}
            </p>
            <p className="text-gray-600 mb-6">
              User ID: {user?.userId}
            </p>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
