import { supabase } from './supabase'
import type { Project, ProjectDocument, SiteFlowData } from './storage'

const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Supabase storage for projects
 * Uses Supabase database - requires authentication
 */
export const supabaseStorage = {
  /**
   * Migrate localStorage data to Supabase (one-time migration)
   */
  async migrateFromLocalStorage(): Promise<number> {
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured, cannot migrate')
      return 0
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('User not authenticated, cannot migrate')
        return 0
      }

      // Get localStorage data
      const localData = localStorage.getItem('docflow-projects')
      if (!localData) {
        return 0
      }

      const localProjects: Project[] = JSON.parse(localData)
      if (localProjects.length === 0) {
        return 0
      }

      // Migrate each project to Supabase
      let migrated = 0
      for (const project of localProjects) {
        try {
          const { error } = await supabase
            .from('projects')
            .insert({
              id: project.id, // Keep original ID
              user_id: user.id,
              title: project.title,
              type: project.type,
              description: project.description,
              content: project.content,
              documents: project.documents || null,
              site_flow: project.siteFlow || null,
              created_at: project.createdAt,
              updated_at: project.updatedAt,
            })

          if (!error) {
            migrated++
          }
        } catch (err) {
          console.error('Error migrating project:', project.id, err)
        }
      }

      // Clear localStorage after successful migration
      if (migrated > 0) {
        localStorage.removeItem('docflow-projects')
        console.log(`✅ Migrated ${migrated} projects from localStorage to Supabase`)
      }

      return migrated
    } catch (error) {
      console.error('Error migrating from localStorage:', error)
      return 0
    }
  },
  /**
   * Get all projects for the current user
   */
  async getAll(): Promise<Project[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file')
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching projects from Supabase:', error)
        return []
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        description: row.description,
        content: row.content,
        documents: row.documents,
        siteFlow: row.site_flow,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    } catch (error) {
      console.error('Error in getAll:', error)
      return []
    }
  },

  /**
   * Get a single project by ID
   */
  async get(id: string): Promise<Project | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured')
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error || !data) return null

      return {
        id: data.id,
        title: data.title,
        type: data.type,
        description: data.description,
        content: data.content,
        documents: data.documents,
        siteFlow: data.site_flow,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    } catch (error) {
      console.error('Error in get:', error)
      return null
    }
  },

  /**
   * Save a new project
   */
  async save(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file')
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: project.title,
          type: project.type,
          description: project.description,
          content: project.content,
          documents: project.documents || null,
          site_flow: project.siteFlow || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving project to Supabase:', error)
        throw error
      }

      return {
        id: data.id,
        title: data.title,
        type: data.type,
        description: data.description,
        content: data.content,
        documents: data.documents,
        siteFlow: data.site_flow,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    } catch (error) {
      console.error('Error in save:', error)
      throw error
    }
  },

  /**
   * Update an existing project
   */
  async update(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured')
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.content !== undefined) updateData.content = updates.content
      if (updates.documents !== undefined) updateData.documents = updates.documents
      if (updates.siteFlow !== undefined) updateData.site_flow = updates.siteFlow

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error || !data) return null

      return {
        id: data.id,
        title: data.title,
        type: data.type,
        description: data.description,
        content: data.content,
        documents: data.documents,
        siteFlow: data.site_flow,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    } catch (error) {
      console.error('Error in update:', error)
      return null
    }
  },

  /**
   * Delete a project
   */
  async delete(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured')
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      return !error
    } catch (error) {
      console.error('Error in delete:', error)
      return false
    }
  },

  /**
   * Clear all projects for the current user
   */
  async clear(): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured')
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('projects')
        .delete()
        .eq('user_id', user.id)
    } catch (error) {
      console.error('Error in clear:', error)
    }
  },
}

