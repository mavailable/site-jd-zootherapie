import { useState, useCallback } from 'react';

interface FileData {
  content: Record<string, unknown>;
  sha: string;
}

interface FileEntry {
  name: string;
  sha: string;
}

export function useContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFile = useCallback(async (path: string): Promise<FileData> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cms/content?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur de lecture');
      }
      return await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchList = useCallback(async (path: string): Promise<FileEntry[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cms/list?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur de lecture');
      }
      const data = await res.json();
      return data.files;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveFile = useCallback(
    async (
      path: string,
      content: Record<string, unknown>,
      sha?: string,
      message?: string
    ): Promise<{ sha: string; commit: string }> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/cms/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, content, sha, message }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erreur de sauvegarde');
        }
        return await res.json();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteFile = useCallback(async (path: string, sha: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cms/delete?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(sha)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur de suppression');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, fetchFile, fetchList, saveFile, deleteFile };
}
