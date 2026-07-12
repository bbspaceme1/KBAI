export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          entity: string | null;
          entity_id: string | null;
          id: string;
          ip_address: string | null;
          metadata: Json | null;
          user_agent: string | null;
          user_id: string | null;
          username: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          ip_address?: string | null;
          metadata?: Json | null;
          user_agent?: string | null;
          user_id?: string | null;
          username?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          ip_address?: string | null;
          metadata?: Json | null;
          user_agent?: string | null;
          user_id?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      benchmark_prices: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          symbol: Database["public"]["Enums"]["benchmark_symbol"];
          value: number;
        };
        Insert: {
          created_at?: string;
          date: string;
          id?: string;
          symbol: Database["public"]["Enums"]["benchmark_symbol"];
          value: number;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          symbol?: Database["public"]["Enums"]["benchmark_symbol"];
          value?: number;
        };
        Relationships: [];
      };
      broadcasts: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          posted_by: string;
          posted_by_username: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          posted_by: string;
          posted_by_username: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          posted_by?: string;
          posted_by_username?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cash_balances: {
        Row: {
          balance: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          balance?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          balance?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      cash_movements: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          movement_type: Database["public"]["Enums"]["cash_movement_type"];
          note: string | null;
          occurred_at: string;
          ref_transaction_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          movement_type: Database["public"]["Enums"]["cash_movement_type"];
          note?: string | null;
          occurred_at?: string;
          ref_transaction_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          movement_type?: Database["public"]["Enums"]["cash_movement_type"];
          note?: string | null;
          occurred_at?: string;
          ref_transaction_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      economic_events: {
        Row: {
          actual: number | null;
          category: string;
          country: string;
          created_at: string;
          event_date: string;
          event_time: string | null;
          forecast: number | null;
          id: string;
          importance: number;
          metadata: Json;
          previous: number | null;
          source: string;
          source_ref: string | null;
          title: string;
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          actual?: number | null;
          category: string;
          country: string;
          created_at?: string;
          event_date: string;
          event_time?: string | null;
          forecast?: number | null;
          id?: string;
          importance?: number;
          metadata?: Json;
          previous?: number | null;
          source?: string;
          source_ref?: string | null;
          title: string;
          unit?: string | null;
          updated_at?: string;
        };
        Update: {
          actual?: number | null;
          category?: string;
          country?: string;
          created_at?: string;
          event_date?: string;
          event_time?: string | null;
          forecast?: number | null;
          id?: string;
          importance?: number;
          metadata?: Json;
          previous?: number | null;
          source?: string;
          source_ref?: string | null;
          title?: string;
          unit?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      eod_prices: {
        Row: {
          close: number;
          created_at: string;
          date: string;
          id: string;
          source: string | null;
          ticker: string;
        };
        Insert: {
          close: number;
          created_at?: string;
          date: string;
          id?: string;
          source?: string | null;
          ticker: string;
        };
        Update: {
          close?: number;
          created_at?: string;
          date?: string;
          id?: string;
          source?: string | null;
          ticker?: string;
        };
        Relationships: [];
      };
      holdings: {
        Row: {
          avg_price: number;
          id: string;
          ticker: string;
          total_lot: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avg_price?: number;
          id?: string;
          ticker: string;
          total_lot?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avg_price?: number;
          id?: string;
          ticker?: string;
          total_lot?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      kbai_index: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          member_count: number | null;
          pct_change: number | null;
          value: number;
        };
        Insert: {
          created_at?: string;
          date: string;
          id?: string;
          member_count?: number | null;
          pct_change?: number | null;
          value: number;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          member_count?: number | null;
          pct_change?: number | null;
          value?: number;
        };
        Relationships: [];
      };
      macro_indicators: {
        Row: {
          country: string;
          created_at: string;
          id: string;
          indicator: string;
          metadata: Json;
          period: string;
          source: string;
          unit: string | null;
          updated_at: string;
          value: number;
        };
        Insert: {
          country: string;
          created_at?: string;
          id?: string;
          indicator: string;
          metadata?: Json;
          period: string;
          source: string;
          unit?: string | null;
          updated_at?: string;
          value: number;
        };
        Update: {
          country?: string;
          created_at?: string;
          id?: string;
          indicator?: string;
          metadata?: Json;
          period?: string;
          source?: string;
          unit?: string | null;
          updated_at?: string;
          value?: number;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          kind: string;
          link: string | null;
          metadata: Json | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          link?: string | null;
          metadata?: Json | null;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          link?: string | null;
          metadata?: Json | null;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tier: string;
          daily_limit: number;
          monthly_limit: number;
          started_at: string | null;
          ends_at: string | null;
          created_at: string;
          status: string;
          payment_gateway: string;
          order_id: string | null;
          auto_renew: boolean;
          cancelled_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tier: string;
          daily_limit?: number;
          monthly_limit?: number;
          started_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
          status?: string;
          payment_gateway?: string;
          order_id?: string | null;
          auto_renew?: boolean;
          cancelled_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tier?: string;
          daily_limit?: number;
          monthly_limit?: number;
          started_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
          status?: string;
          payment_gateway?: string;
          order_id?: string | null;
          auto_renew?: boolean;
          cancelled_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_usage_logs: {
        Row: {
          id: string;
          user_id: string | null;
          model: string;
          input_tokens: number;
          output_tokens: number;
          total_tokens: number;
          cost_usd: number;
          operation: string | null;
          status: string;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          model: string;
          input_tokens: number;
          output_tokens: number;
          total_tokens: number;
          cost_usd?: number;
          operation?: string | null;
          status?: string;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          model?: string;
          input_tokens?: number;
          output_tokens?: number;
          total_tokens?: number;
          cost_usd?: number;
          operation?: string | null;
          status?: string;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      portfolio_snapshots: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          total_cost: number;
          total_pl: number;
          total_value: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          id?: string;
          total_cost?: number;
          total_pl?: number;
          total_value?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          total_cost?: number;
          total_pl?: number;
          total_value?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      price_alerts: {
        Row: {
          condition: string;
          created_at: string;
          id: string;
          is_active: boolean;
          threshold: number;
          ticker: string;
          triggered_at: string | null;
          user_id: string;
        };
        Insert: {
          condition: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          threshold: number;
          ticker: string;
          triggered_at?: string | null;
          user_id: string;
        };
        Update: {
          condition?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          threshold?: number;
          ticker?: string;
          triggered_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          onboarded_at: string | null;
          preferences: Json;
          updated_at: string;
          username: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          onboarded_at?: string | null;
          preferences?: Json;
          updated_at?: string;
          username: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          onboarded_at?: string | null;
          preferences?: Json;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          created_at: string;
          id: string;
          lot: number;
          note: string | null;
          price: number;
          side: Database["public"]["Enums"]["txn_side"];
          ticker: string;
          transacted_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lot: number;
          note?: string | null;
          price: number;
          side: Database["public"]["Enums"]["txn_side"];
          ticker: string;
          transacted_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lot?: number;
          note?: string | null;
          price?: number;
          side?: Database["public"]["Enums"]["txn_side"];
          ticker?: string;
          transacted_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_2fa: {
        Row: {
          created_at: string;
          enabled: boolean;
          enrolled_at: string | null;
          last_used_at: string | null;
          recovery_codes: string[] | null;
          secret: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          enrolled_at?: string | null;
          last_used_at?: string | null;
          recovery_codes?: string[] | null;
          secret: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          enrolled_at?: string | null;
          last_used_at?: string | null;
          recovery_codes?: string[] | null;
          secret?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_sessions: {
        Row: {
          created_at: string;
          device_label: string | null;
          ended_at: string | null;
          id: string;
          ip_address: string | null;
          is_active: boolean;
          last_seen_at: string;
          user_agent: string | null;
          user_id: string;
          username: string | null;
        };
        Insert: {
          created_at?: string;
          device_label?: string | null;
          ended_at?: string | null;
          id?: string;
          ip_address?: string | null;
          is_active?: boolean;
          last_seen_at?: string;
          user_agent?: string | null;
          user_id: string;
          username?: string | null;
        };
        Update: {
          created_at?: string;
          device_label?: string | null;
          ended_at?: string | null;
          id?: string;
          ip_address?: string | null;
          is_active?: boolean;
          last_seen_at?: string;
          user_agent?: string | null;
          user_id?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      watchlist: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          ticker: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          ticker: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          ticker?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user" | "advisor";
      benchmark_symbol: "IHSG" | "GOLD" | "MAMI" | "BTC" | "SMF";
      cash_movement_type: "DEPOSIT" | "WITHDRAW" | "BUY" | "SELL" | "ADJUST";
      txn_side: "BUY" | "SELL";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "advisor"],
      benchmark_symbol: ["IHSG", "GOLD", "MAMI", "BTC", "SMF"],
      cash_movement_type: ["DEPOSIT", "WITHDRAW", "BUY", "SELL", "ADJUST"],
      txn_side: ["BUY", "SELL"],
    },
  },
} as const;
