import { Document } from '@/shared/types';
import { AlertTriangle, Calendar, Clock, Shield, FileText, MoreVertical } from 'lucide-react';
import { useState } from 'react';

interface DocumentCardProps {
  document: Document;
  onEdit: (document: Document) => void;
  onDelete: (id: number) => void;
  onRenew: (id: number) => void;
}

export default function DocumentCard({ document, onEdit, onDelete, onRenew }: DocumentCardProps) {
  const [showActions, setShowActions] = useState(false);
  
  const expirationDate = new Date(document.expiration_date);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const isExpired = daysUntilExpiry < 0;
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  const isCritical = document.is_critical;

  const getStatusColor = () => {
    if (isExpired) return 'from-red-500 to-red-600';
    if (isExpiringSoon && isCritical) return 'from-orange-500 to-red-500';
    if (isExpiringSoon) return 'from-yellow-500 to-orange-500';
    if (isCritical) return 'from-purple-500 to-purple-600';
    return 'from-blue-500 to-blue-600';
  };

  const getStatusText = () => {
    if (isExpired) return `Expired ${Math.abs(daysUntilExpiry)} days ago`;
    if (daysUntilExpiry === 0) return 'Expires today';
    if (daysUntilExpiry === 1) return 'Expires tomorrow';
    if (isExpiringSoon) return `Expires in ${daysUntilExpiry} days`;
    return `Expires in ${daysUntilExpiry} days`;
  };

  return (
    <div className={`relative bg-gradient-to-br ${getStatusColor()} p-0.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group`}>
      <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${getStatusColor()}`}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                {document.title}
              </h3>
              {document.document_type && (
                <p className="text-sm text-gray-500">{document.document_type}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isCritical && (
              <div className="p-1.5 bg-red-100 rounded-full" title="Critical Document">
                <Shield className="w-4 h-4 text-red-600" />
              </div>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 w-32">
                  <button
                    onClick={() => {
                      onEdit(document);
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onRenew(document.id);
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Mark Renewed
                  </button>
                  <button
                    onClick={() => {
                      onDelete(document.id);
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {document.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {document.description}
          </p>
        )}

        {/* Status */}
        <div className="flex items-center space-x-2 mb-4">
          {(isExpired || isExpiringSoon) && (
            <div className="flex items-center space-x-1 text-orange-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
          )}
          
          {!isExpired && !isExpiringSoon && (
            <div className="flex items-center space-x-1 text-green-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{getStatusText()}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>Expires {expirationDate.toLocaleDateString()}</span>
          </div>
          
          {document.last_renewed_date && (
            <span className="text-green-600">
              Renewed {new Date(document.last_renewed_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
