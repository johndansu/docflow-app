export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          type: 'PRD' | 'Design Prompt' | 'User Stories' | 'Specs'
          description: string | null
          content: string
          documents: Json | null
          site_flow: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          type: 'PRD' | 'Design Prompt' | 'User Stories' | 'Specs'
          description?: string | null
          content: string
          documents?: Json | null
          site_flow?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          type?: 'PRD' | 'Design Prompt' | 'User Stories' | 'Specs'
          description?: string | null
          content?: string
          documents?: Json | null
          site_flow?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

