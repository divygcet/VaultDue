import { useState, useCallback } from 'react';
import { Document, CreateDocument, UpdateDocument } from '@/shared/types';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const createDocument = useCallback(async (document: CreateDocument) => {
    setError(null);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(document),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create document');
      }
      
      const newDocument = await response.json();
      setDocuments(prev => [...prev, newDocument]);
      return newDocument;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, []);

  const updateDocument = useCallback(async (id: number, updates: UpdateDocument) => {
    setError(null);
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update document');
      }
      
      const updatedDocument = await response.json();
      setDocuments(prev => prev.map(doc => doc.id === id ? updatedDocument : doc));
      return updatedDocument;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, []);

  const deleteDocument = useCallback(async (id: number) => {
    setError(null);
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, []);

  const renewDocument = useCallback(async (id: number) => {
    setError(null);
    try {
      const response = await fetch(`/api/documents/${id}/renew`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to renew document');
      }
      
      const renewedDocument = await response.json();
      setDocuments(prev => prev.map(doc => doc.id === id ? renewedDocument : doc));
      return renewedDocument;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }, []);

  return {
    documents,
    loading,
    error,
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    renewDocument,
  };
}
