import { useEffect, useState } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import Layout from '@/react-app/components/Layout';
import DashboardStats from '@/react-app/components/DashboardStats';
import DocumentCard from '@/react-app/components/DocumentCard';
import DocumentModal from '@/react-app/components/DocumentModal';
import { useDocuments } from '@/react-app/hooks/useDocuments';
import { useDashboard } from '@/react-app/hooks/useDashboard';
import { Document, CreateDocument, UpdateDocument } from '@/shared/types';

export default function Home() {
  const { user, isPending, redirectToLogin } = useAuth();
  const { documents, loading, fetchDocuments, createDocument, updateDocument, deleteDocument, renewDocument } = useDocuments();
  const { stats, fetchDashboardStats } = useDashboard();
  
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'expiring' | 'expired'>('all');

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchDashboardStats();
    }
  }, [user, fetchDocuments, fetchDashboardStats]);

  const handleSaveDocument = async (documentData: CreateDocument) => {
    if (editingDocument) {
      await updateDocument(editingDocument.id, documentData as UpdateDocument);
    } else {
      await createDocument(documentData);
    }
    setEditingDocument(undefined);
    fetchDashboardStats(); // Refresh stats after changes
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setShowModal(true);
  };

  const handleDeleteDocument = async (id: number) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id);
      fetchDashboardStats();
    }
  };

  const handleRenewDocument = async (id: number) => {
    await renewDocument(id);
    fetchDashboardStats();
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const today = new Date();
    const expirationDate = new Date(doc.expiration_date);
    const daysUntilExpiry = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    switch (filterType) {
      case 'critical':
        return doc.is_critical;
      case 'expiring':
        return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
      case 'expired':
        return daysUntilExpiry < 0;
      default:
        return true;
    }
  });

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin">
          <Loader2 className="w-10 h-10 text-white" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">D</span>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">Welcome to VaultDue</h1>
          <p className="text-white/80 mb-8 leading-relaxed">
            Never miss a critical document deadline again. Track contracts, licenses, and important documents with WhatsApp reminders.
          </p>
          
          <button
            onClick={redirectToLogin}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Get Started with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout
      title="Document Dashboard"
      actions={
        <button
          onClick={() => {
            setEditingDocument(undefined);
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-4 h-4" />
          <span>Add Document</span>
        </button>
      }
    >
      {/* Dashboard Stats */}
      <DashboardStats {...stats} />

      {/* Search and Filter */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="pl-10 pr-8 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="all">All Documents</option>
              <option value="critical">Critical Only</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-white/60" />
          </div>
          <h3 className="text-white text-lg font-medium mb-2">
            {searchTerm || filterType !== 'all' ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-white/60 mb-6">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Add your first document to start tracking deadlines.'
            }
          </p>
          {!searchTerm && filterType === 'all' && (
            <button
              onClick={() => {
                setEditingDocument(undefined);
                setShowModal(true);
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
            >
              Add Your First Document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onEdit={handleEditDocument}
              onDelete={handleDeleteDocument}
              onRenew={handleRenewDocument}
            />
          ))}
        </div>
      )}

      {/* Document Modal */}
      <DocumentModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingDocument(undefined);
        }}
        onSave={handleSaveDocument}
        document={editingDocument}
      />
    </Layout>
  );
}
