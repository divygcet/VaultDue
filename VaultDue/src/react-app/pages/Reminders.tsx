import { useEffect, useState } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { 
  Bell, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Send,
  Filter,
  Loader2,
  FileText
} from 'lucide-react';
import Layout from '@/react-app/components/Layout';

interface Reminder {
  id: number;
  document_id: number;
  reminder_date: string;
  reminder_type: string;
  is_sent: boolean;
  created_at: string;
  document_title: string;
  expiration_date: string;
  is_critical: boolean;
}

export default function Reminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'pending'>('all');
  const [sendingTest, setSendingTest] = useState<number | null>(null);
  

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  const fetchReminders = async () => {
    try {
      const response = await fetch('/api/reminders');
      if (response.ok) {
        const data = await response.json();
        setReminders(data);
      }
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestReminder = async (documentId: number) => {
    setSendingTest(documentId);
    try {
      const response = await fetch(`/api/documents/${documentId}/test-reminder`, {
        method: 'POST',
      });
      
      if (response.ok) {
        alert('Test reminder sent successfully!');
      } else {
        alert('Failed to send test reminder');
      }
    } catch (error) {
      alert('Failed to send test reminder');
    } finally {
      setSendingTest(null);
    }
  };

  

  const filteredReminders = reminders.filter(reminder => {
    switch (filter) {
      case 'sent':
        return reminder.is_sent;
      case 'pending':
        return !reminder.is_sent;
      default:
        return true;
    }
  });

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'expires_today':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'expires_soon':
        return <Bell className="w-5 h-5 text-yellow-500" />;
      default:
        return <Calendar className="w-5 h-5 text-blue-500" />;
    }
  };

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case 'expired':
        return 'Expired';
      case 'expires_today':
        return 'Expires Today';
      case 'expires_soon':
        return 'Expires Soon';
      case 'expires_week':
        return 'Expires This Week';
      case 'expires_two_weeks':
        return 'Expires in 2 Weeks';
      case 'expires_month':
        return 'Expires This Month';
      default:
        return 'Reminder';
    }
  };

  

  if (loading) {
    return (
      <Layout title="Reminders">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Reminders">
      {/* Filter Controls */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-lg mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-white/60" />
            <span className="text-white font-medium">Filter Reminders:</span>
          </div>
          
          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'All Reminders' },
              { value: 'sent', label: 'Sent' },
              { value: 'pending', label: 'Pending' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as any)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  filter === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-white/60" />
          </div>
          <h3 className="text-white text-lg font-medium mb-2">No reminders found</h3>
          <p className="text-white/60">
            {filter === 'all' 
              ? 'Your document reminders will appear here when they are scheduled.'
              : `No ${filter} reminders found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReminders.map((reminder) => (
            <div
              key={reminder.id}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {getReminderIcon(reminder.reminder_type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-white font-semibold">{reminder.document_title}</h3>
                      {reminder.is_critical && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">
                          Critical
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-white/70">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Reminder: {new Date(reminder.reminder_date).toLocaleDateString()}</span>
                      </span>
                      
                      <span className="flex items-center space-x-1">
                        <FileText className="w-4 h-4" />
                        <span>Expires: {new Date(reminder.expiration_date).toLocaleDateString()}</span>
                      </span>
                      
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{getReminderTypeLabel(reminder.reminder_type)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {reminder.is_sent ? (
                      <span className="flex items-center space-x-1 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Sent</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-orange-400 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>Pending</span>
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => sendTestReminder(reminder.document_id)}
                    disabled={sendingTest === reminder.document_id}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 text-blue-300 rounded text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                  >
                    {sendingTest === reminder.document_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Test</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Boxes */}
      <div className="mt-8 space-y-6">
        {/* General Info */}
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <Bell className="w-5 h-5 text-blue-300 mt-0.5" />
            <div>
              <h4 className="text-blue-100 font-medium mb-2">How Reminders Work</h4>
              <ul className="text-blue-200/80 text-sm space-y-1">
                <li>• Reminders are automatically sent based on your notification preferences</li>
                <li>• The system checks for expiring documents twice daily (9 AM and 6 PM)</li>
                <li>• You can test individual reminders using the "Test" button</li>
                <li>• Configure your reminder preferences in Profile Settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
