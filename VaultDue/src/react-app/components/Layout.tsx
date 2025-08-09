import { ReactNode } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { Shield, Bell, Users, FileText, Settings } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

export default function Layout({ children, title, actions }: LayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">VaultDue</h1>
              </div>
              
              <nav className="hidden md:flex space-x-6">
                <a href="/" className="text-white/80 hover:text-white transition-colors flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Documents</span>
                </a>
                <a href="/reminders" className="text-white/60 hover:text-white transition-colors flex items-center space-x-2">
                  <Bell className="w-4 h-4" />
                  <span>Reminders</span>
                </a>
                <a href="/team" className="text-white/60 hover:text-white transition-colors flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Team</span>
                </a>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <div className="hidden md:flex items-center space-x-3">
                    <img
                      src={user.google_user_data.picture || '/api/placeholder/32/32'}
                      alt="Profile"
                      className="w-8 h-8 rounded-full border-2 border-white/20"
                    />
                    <span className="text-white/80 text-sm">
                      {user.google_user_data.name || user.email}
                    </span>
                  </div>
                  
                  <a
                    href="/profile"
                    className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                    title="Profile Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page Header */}
      {(title || actions) && (
        <div className="bg-white/5 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              {title && (
                <h2 className="text-2xl font-bold text-white">{title}</h2>
              )}
              {actions && (
                <div className="flex items-center space-x-4">
                  {actions}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
