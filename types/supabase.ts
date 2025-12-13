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
      // Add your table types here
      // Example:
      // posts: {
      //   Row: {
      //     id: string
      //     title: string
      //     content: string
      //     created_at: string
      //   }
      //   Insert: {
      //     id?: string
      //     title: string
      //     content: string
      //     created_at?: string
      //   }
      //   Update: {
      //     id?: string
      //     title?: string
      //     content?: string
      //     created_at?: string
      //   }
      // }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

