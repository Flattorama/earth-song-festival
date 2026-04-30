export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendees: {
        Row: {
          created_at: string
          email: string
          id: string
          is_buyer: boolean
          name: string
          phone: string | null
          purchase_id: string
          waiver_ip_address: string | null
          waiver_signed_at: string | null
          waiver_status: string
          waiver_token: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_buyer?: boolean
          name: string
          phone?: string | null
          purchase_id: string
          waiver_ip_address?: string | null
          waiver_signed_at?: string | null
          waiver_status?: string
          waiver_token?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_buyer?: boolean
          name?: string
          phone?: string | null
          purchase_id?: string
          waiver_ip_address?: string | null
          waiver_signed_at?: string | null
          waiver_status?: string
          waiver_token?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          buyer_email: string
          buyer_name: string
          created_at: string
          id: string
          quantity: number
          referral_code: string | null
          stripe_session_id: string
          ticket_type: string
        }
        Insert: {
          buyer_email: string
          buyer_name: string
          created_at?: string
          id?: string
          quantity?: number
          referral_code?: string | null
          stripe_session_id: string
          ticket_type: string
        }
        Update: {
          buyer_email?: string
          buyer_name?: string
          created_at?: string
          id?: string
          quantity?: number
          referral_code?: string | null
          stripe_session_id?: string
          ticket_type?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          facilitator_email: string | null
          facilitator_name: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          facilitator_email?: string | null
          facilitator_name: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          facilitator_email?: string | null
          facilitator_name?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      stripe_orders: {
        Row: {
          amount_subtotal: number
          amount_total: number
          checkout_session_id: string
          created_at: string
          currency: string
          customer_id: string
          deleted_at: string | null
          id: number
          payment_intent_id: string | null
          payment_status: string
          status: "pending" | "completed" | "canceled"
          updated_at: string
        }
        Insert: {
          amount_subtotal: number
          amount_total: number
          checkout_session_id: string
          created_at?: string
          currency: string
          customer_id: string
          deleted_at?: string | null
          id?: number
          payment_intent_id?: string | null
          payment_status: string
          status?: "pending" | "completed" | "canceled"
          updated_at?: string
        }
        Update: {
          amount_subtotal?: number
          amount_total?: number
          checkout_session_id?: string
          created_at?: string
          currency?: string
          customer_id?: string
          deleted_at?: string | null
          id?: number
          payment_intent_id?: string | null
          payment_status?: string
          status?: "pending" | "completed" | "canceled"
          updated_at?: string
        }
        Relationships: []
      }
      waiver_acceptances: {
        Row: {
          attendee_address: string | null
          attendee_email: string
          attendee_name: string
          attendee_phone: string | null
          accepted_at: string | null
          created_at: string
          id: string
          ip_address: string | null
          referral_code: string | null
          stripe_session_id: string | null
          ticket_type: string
          waiver_version: string
        }
        Insert: {
          attendee_address?: string | null
          attendee_email: string
          attendee_name: string
          attendee_phone?: string | null
          accepted_at?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          referral_code?: string | null
          stripe_session_id?: string | null
          ticket_type: string
          waiver_version: string
        }
        Update: {
          attendee_address?: string | null
          attendee_email?: string
          attendee_name?: string
          attendee_phone?: string | null
          accepted_at?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          referral_code?: string | null
          stripe_session_id?: string | null
          ticket_type?: string
          waiver_version?: string
        }
        Relationships: []
      }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
