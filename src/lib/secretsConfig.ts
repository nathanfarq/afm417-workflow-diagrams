import { secretsService } from '../services/secretsService';

interface SecretsCache {
  SUPABASE_URL: string | null;
  SUPABASE_ANON_KEY: string | null;
  OPENAI_API_KEY: string | null;
}

class SecretsConfig {
  private cache: SecretsCache = {
    SUPABASE_URL: null,
    SUPABASE_ANON_KEY: null,
    OPENAI_API_KEY: null,
  };

  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.loadSecrets();
    return this.initializationPromise;
  }

  private async loadSecrets(): Promise<void> {
    try {
      const [supabaseUrl, supabaseAnonKey, openaiApiKey] = await Promise.all([
        secretsService.getSecret('VITE_SUPABASE_URL'),
        secretsService.getSecret('VITE_SUPABASE_ANON_KEY'),
        secretsService.getSecret('VITE_OPENAI_API_KEY'),
      ]);

      this.cache.SUPABASE_URL = supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
      this.cache.SUPABASE_ANON_KEY = supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;
      this.cache.OPENAI_API_KEY = openaiApiKey || import.meta.env.VITE_OPENAI_API_KEY;

      this.initialized = true;
      console.log('Secrets loaded successfully from database');
    } catch (error) {
      console.error('Error loading secrets:', error);
      this.cache.SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      this.cache.SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      this.cache.OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
      this.initialized = true;
    }
  }

  get supabaseUrl(): string {
    return this.cache.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
  }

  get supabaseAnonKey(): string {
    return this.cache.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }

  get openaiApiKey(): string {
    return this.cache.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || '';
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async updateSecret(key: string, value: string, description?: string): Promise<boolean> {
    const success = await secretsService.setSecret({ key, value, description });
    if (success) {
      await this.loadSecrets();
    }
    return success;
  }

  clearCache(): void {
    this.cache = {
      SUPABASE_URL: null,
      SUPABASE_ANON_KEY: null,
      OPENAI_API_KEY: null,
    };
    this.initialized = false;
    this.initializationPromise = null;
  }
}

export const secretsConfig = new SecretsConfig();
