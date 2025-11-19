import { createClient } from '@supabase/supabase-js';
import { Node, Edge } from 'reactflow';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      processes: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          narrative: string;
          diagram_data: {
            nodes: Node[];
            edges: Edge[];
          };
          controls: Record<string, unknown>[];
          weaknesses: Record<string, unknown>[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          narrative: string;
          diagram_data?: {
            nodes: Node[];
            edges: Edge[];
          };
          controls?: Record<string, unknown>[];
          weaknesses?: Record<string, unknown>[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          narrative?: string;
          diagram_data?: {
            nodes: Node[];
            edges: Edge[];
          };
          controls?: Record<string, unknown>[];
          weaknesses?: Record<string, unknown>[];
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
