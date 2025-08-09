import { useState, useEffect } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { 
  User, 
  Phone, 
  Building2, 
  Bell, 
  Activity, 
  HelpCircle,
  Save,
  MessageSquare,
  Mail,
  Settings,
  LogOut,
  AlertCircle,
  Loader2,
  Send,
  CheckCircle,
  X
} from 'lucide-react';
import Layout from '@/react-app/components/Layout';

interface UserProfile {
  phone_number?: string;
  business_name?: string;
  role?: string;
  preferred_reminder_channel: 'whatsapp' | 'email' | 'sms';
  reminder_frequency: '30_days' | '14_days' | '7_days' | '3_days' | '1_day';
  reminder_time_preference: 'morning' | 'evening';
  two_factor_enabled: boolean;
}

interface ActivityLog {
  id: number;
  action_type: string;
  description: string;
  related_document_id?: number;
  created_at: string;
}

interface FeedbackForm {
  feedback_type: string;
  subject: string;
  message: string;
}

export default function UserProfile() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('information');
  const [profile, setProfile] = useState<UserProfile>({
    preferred_reminder_channel: 'whatsapp',
    reminder_frequency: '30_days',
    reminder_time_preference: 'morning',
    two_factor_enabled: false,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>({
    feedback_type: 'general',
    subject: '',
    message: ''
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  

  useEffect(() => {
    fetchProfile();
    fetchActivityLogs();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const response = await fetch('/api/activity-logs');
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const openWhatsAppSupport = () => {
    const phoneNumber = '8851670050';
    const message = encodeURIComponent(`Hi, I need support with VaultDue. User: ${user?.email}`);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const submitFeedback = async () => {
    if (!feedbackForm.message.trim()) {
      setMessage({ type: 'error', text: 'Please enter your feedback message.' });
      return;
    }

    setSubmittingFeedback(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackForm),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Thank you for your feedback! We appreciate your input.' });
        setShowFeedbackModal(false);
        setFeedbackForm({
          feedback_type: 'general',
          subject: '',
          message: ''
        });
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to submit feedback. Please try again.' });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const tabs = [
    { id: 'information', label: 'Information', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  

  if (loading) {
    return (
      <Layout title="Profile Settings">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Profile Settings"
      actions={
        <button
          onClick={logout}
          className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      }
    >
      <div className="max-w-4xl mx-auto">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/30 text-green-100' 
              : 'bg-red-500/20 border border-red-500/30 text-red-100'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-lg mb-6">
          <div className="flex space-x-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-lg p-6">
          {/* Information Tab */}
          {activeTab === 'information' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={user?.google_user_data?.name || ''}
                    disabled
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white/60 cursor-not-allowed"
                  />
                  <p className="text-xs text-white/50 mt-1">From your Google account</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white/60 cursor-not-allowed"
                  />
                  <p className="text-xs text-white/50 mt-1">From your Google account</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                    <input
                      type="tel"
                      placeholder="+918851670050 (with country code)"
                      value={profile.phone_number || ''}
                      onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-white/50 mt-1">Enter with country code (e.g. +918851670050) for WhatsApp reminders</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Business Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                    <input
                      type="text"
                      placeholder="Your Company Name"
                      value={profile.business_name || ''}
                      onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-2">Role</label>
                  <select
                    value={profile.role || ''}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="" className="bg-slate-800 text-white">Select your role...</option>
                    <option value="Founder" className="bg-slate-800 text-white">Founder</option>
                    <option value="CEO" className="bg-slate-800 text-white">CEO</option>
                    <option value="Admin" className="bg-slate-800 text-white">Admin</option>
                    <option value="Legal Team" className="bg-slate-800 text-white">Legal Team</option>
                    <option value="Operations" className="bg-slate-800 text-white">Operations</option>
                    <option value="Finance" className="bg-slate-800 text-white">Finance</option>
                    <option value="Other" className="bg-slate-800 text-white">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Notification Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-3">Preferred Reminder Channel</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                      { value: 'email', label: 'Email', icon: Mail },
                      { value: 'sms', label: 'SMS', icon: Phone },
                    ].map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setProfile({ ...profile, preferred_reminder_channel: option.value as any })}
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                            profile.preferred_reminder_channel === option.value
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-100'
                              : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-3">Reminder Frequency</label>
                  <select
                    value={profile.reminder_frequency}
                    onChange={(e) => setProfile({ ...profile, reminder_frequency: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="30_days" className="bg-slate-800 text-white">30 days before</option>
                    <option value="14_days" className="bg-slate-800 text-white">14 days before</option>
                    <option value="7_days" className="bg-slate-800 text-white">7 days before</option>
                    <option value="3_days" className="bg-slate-800 text-white">3 days before</option>
                    <option value="1_day" className="bg-slate-800 text-white">1 day before</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-3">Preferred Time</label>
                  <div className="flex space-x-3">
                    {[
                      { value: 'morning', label: 'Morning (9 AM)' },
                      { value: 'evening', label: 'Evening (6 PM)' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setProfile({ ...profile, reminder_time_preference: option.value as any })}
                        className={`flex-1 p-3 rounded-lg border transition-all duration-200 ${
                          profile.reminder_time_preference === option.value
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-100'
                            : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
              
              {activityLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/60">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-white text-sm">{log.description}</p>
                        <p className="text-white/50 text-xs mt-1">
                          {new Date(log.created_at).toLocaleDateString()} at {new Date(log.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          

          {/* Support Tab */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Support & Help</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="p-4 bg-white/5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors text-left">
                  <div className="flex items-center space-x-3 mb-2">
                    <HelpCircle className="w-5 h-5 text-blue-500" />
                    <span className="text-white font-medium">Help Documentation</span>
                  </div>
                  <p className="text-white/60 text-sm">Learn how to use VaultDue effectively</p>
                </button>

                <button 
                  onClick={openWhatsAppSupport}
                  className="p-4 bg-white/5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    <span className="text-white font-medium">Contact Support</span>
                  </div>
                  <p className="text-white/60 text-sm">Chat with us directly on WhatsApp</p>
                </button>

                <button 
                  onClick={() => setShowFeedbackModal(true)}
                  className="p-4 bg-white/5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Settings className="w-5 h-5 text-purple-500" />
                    <span className="text-white font-medium">Feature Requests</span>
                  </div>
                  <p className="text-white/60 text-sm">Suggest new features or improvements</p>
                </button>

                <button 
                  onClick={() => setShowFeedbackModal(true)}
                  className="p-4 bg-white/5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Send className="w-5 h-5 text-orange-500" />
                    <span className="text-white font-medium">Send Feedback</span>
                  </div>
                  <p className="text-white/60 text-sm">Share your thoughts and experiences</p>
                </button>
              </div>
            </div>
          )}

          {/* Save Button */}
          {(activeTab === 'information' || activeTab === 'notifications') && (
            <div className="mt-8 pt-6 border-t border-white/20">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>

        

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-lg w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">Send Feedback</h3>
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Type</label>
                    <select
                      value={feedbackForm.feedback_type}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback_type: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent [&>option]:bg-slate-800 [&>option]:text-white"
                    >
                      <option value="general" className="bg-slate-800 text-white">General Feedback</option>
                      <option value="feature_request" className="bg-slate-800 text-white">Feature Request</option>
                      <option value="bug_report" className="bg-slate-800 text-white">Bug Report</option>
                      <option value="improvement" className="bg-slate-800 text-white">Improvement Suggestion</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Subject (Optional)</label>
                    <input
                      type="text"
                      placeholder="Brief description..."
                      value={feedbackForm.subject}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, subject: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Message</label>
                    <textarea
                      placeholder="Tell us what you think..."
                      value={feedbackForm.message}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1 px-4 py-2 text-white/80 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitFeedback}
                    disabled={submittingFeedback || !feedbackForm.message.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {submittingFeedback ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{submittingFeedback ? 'Sending...' : 'Send'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
