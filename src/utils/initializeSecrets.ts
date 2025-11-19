import { secretsService, SecretInput } from '../services/secretsService';

export async function initializeSecretsFromEnv(): Promise<boolean> {
  const secrets: SecretInput[] = [
    {
      key: 'VITE_SUPABASE_URL',
      value: import.meta.env.VITE_SUPABASE_URL || '',
      description: 'Supabase project URL',
    },
    {
      key: 'VITE_SUPABASE_ANON_KEY',
      value: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      description: 'Supabase anonymous key',
    },
    {
      key: 'VITE_OPENAI_API_KEY',
      value: import.meta.env.VITE_OPENAI_API_KEY || '',
      description: 'OpenAI API key',
    },
  ];

  const validSecrets = secrets.filter(s => s.value !== '');

  if (validSecrets.length === 0) {
    console.warn('No secrets found in environment variables to initialize');
    return false;
  }

  console.log(`Initializing ${validSecrets.length} secrets in database...`);
  const success = await secretsService.initializeSecrets(validSecrets);

  if (success) {
    console.log('Secrets initialized successfully');
  } else {
    console.error('Failed to initialize some secrets');
  }

  return success;
}

export async function checkSecretsExist(): Promise<boolean> {
  const secrets = await secretsService.getAllSecrets();
  return secrets.length > 0;
}
