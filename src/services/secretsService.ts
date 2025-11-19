import { supabase } from '../lib/supabase';

export interface Secret {
  id: string;
  key: string;
  value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface SecretInput {
  key: string;
  value: string;
  description?: string;
}

class SecretsService {
  async getSecret(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('secrets')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching secret ${key}:`, error);
        return null;
      }

      return data?.value || null;
    } catch (error) {
      console.error(`Exception fetching secret ${key}:`, error);
      return null;
    }
  }

  async getAllSecrets(): Promise<Secret[]> {
    try {
      const { data, error } = await supabase
        .from('secrets')
        .select('*')
        .order('key', { ascending: true });

      if (error) {
        console.error('Error fetching all secrets:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching all secrets:', error);
      return [];
    }
  }

  async setSecret(input: SecretInput): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('secrets')
        .upsert(
          {
            key: input.key,
            value: input.value,
            description: input.description || '',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'key',
          }
        );

      if (error) {
        console.error(`Error setting secret ${input.key}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Exception setting secret ${input.key}:`, error);
      return false;
    }
  }

  async deleteSecret(key: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('secrets')
        .delete()
        .eq('key', key);

      if (error) {
        console.error(`Error deleting secret ${key}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Exception deleting secret ${key}:`, error);
      return false;
    }
  }

  async initializeSecrets(secrets: SecretInput[]): Promise<boolean> {
    try {
      const results = await Promise.all(
        secrets.map(secret => this.setSecret(secret))
      );

      return results.every(result => result === true);
    } catch (error) {
      console.error('Exception initializing secrets:', error);
      return false;
    }
  }
}

export const secretsService = new SecretsService();
