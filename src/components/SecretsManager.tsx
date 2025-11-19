import { useState, useEffect } from 'react';
import { secretsService, Secret, SecretInput } from '../services/secretsService';
import { Key, Plus, Trash2, Save, X } from 'lucide-react';

export function SecretsManager() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newSecret, setNewSecret] = useState<SecretInput>({
    key: '',
    value: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSecrets();
  }, []);

  const loadSecrets = async () => {
    setIsLoading(true);
    const data = await secretsService.getAllSecrets();
    setSecrets(data);
    setIsLoading(false);
  };

  const handleAddSecret = async () => {
    if (!newSecret.key || !newSecret.value) {
      setError('Key and value are required');
      return;
    }

    const success = await secretsService.setSecret(newSecret);
    if (success) {
      setSuccessMessage('Secret added successfully');
      setNewSecret({ key: '', value: '', description: '' });
      setIsAdding(false);
      await loadSecrets();
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError('Failed to add secret');
    }
  };

  const handleDeleteSecret = async (key: string) => {
    if (!confirm(`Are you sure you want to delete the secret "${key}"?`)) {
      return;
    }

    const success = await secretsService.deleteSecret(key);
    if (success) {
      setSuccessMessage('Secret deleted successfully');
      await loadSecrets();
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError('Failed to delete secret');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Key className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Secrets Manager</h2>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isAdding ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Secret
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={() => setError(null)} className="float-right">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {isAdding && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Add New Secret</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key *
                </label>
                <input
                  type="text"
                  value={newSecret.key}
                  onChange={(e) => setNewSecret({ ...newSecret, key: e.target.value })}
                  placeholder="e.g., VITE_OPENAI_API_KEY"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value *
                </label>
                <input
                  type="password"
                  value={newSecret.value}
                  onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                  placeholder="Secret value"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newSecret.description}
                  onChange={(e) => setNewSecret({ ...newSecret, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleAddSecret}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Secret
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {secrets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No secrets configured. Click "Add Secret" to get started.
            </div>
          ) : (
            secrets.map((secret) => (
              <div
                key={secret.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{secret.key}</div>
                  {secret.description && (
                    <div className="text-sm text-gray-500 mt-1">{secret.description}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Updated: {new Date(secret.updated_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSecret(secret.key)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete secret"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
