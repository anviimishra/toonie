/**
 * Database types for the schema in supabase/migrations.
 *
 * Hand-written to match that migration exactly, in the shape the Supabase CLI
 * emits, so it can be replaced wholesale once the project is linked:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 *
 * Keep this in step with the migration -- it is the contract the rest of the
 * app types against.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Declared as runtime arrays, not bare unions, so the values are available for
// zod schemas and for the test that checks them against the SQL enums.
export const STORY_SOURCES = ["app", "robot"] as const;
export const STORY_STATUSES = ["transcribing", "scripting", "drawing", "ready", "failed"] as const;
export const DELIVERY_STATUSES = ["queued", "printed"] as const;

export type StorySource = (typeof STORY_SOURCES)[number];
export type StoryStatus = (typeof STORY_STATUSES)[number];
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export type Database = {
  public: {
    Tables: {
      capsules: {
        Row: {
          id: string;
          name: string;
          pair_code: string;
          auto_send: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          pair_code: string;
          auto_send?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          pair_code?: string;
          auto_send?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          capsule_id: string;
          name: string;
          role: string | null;
          character_preset: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          capsule_id: string;
          name: string;
          role?: string | null;
          character_preset?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          capsule_id?: string;
          name?: string;
          role?: string | null;
          character_preset?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_capsule_id_fkey";
            columns: ["capsule_id"];
            referencedRelation: "capsules";
            referencedColumns: ["id"];
          },
        ];
      };
      devices: {
        Row: {
          id: string;
          capsule_id: string;
          device_token: string;
          last_seen_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          capsule_id: string;
          device_token: string;
          last_seen_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          capsule_id?: string;
          device_token?: string;
          last_seen_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "devices_capsule_id_fkey";
            columns: ["capsule_id"];
            referencedRelation: "capsules";
            referencedColumns: ["id"];
          },
        ];
      };
      stories: {
        Row: {
          id: string;
          capsule_id: string;
          author_member_id: string | null;
          source: StorySource;
          panel_count: number;
          audio_url: string | null;
          transcript: string | null;
          script_json: Json | null;
          status: StoryStatus;
          comic_url: string | null;
          print_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          capsule_id: string;
          author_member_id?: string | null;
          source?: StorySource;
          panel_count: number;
          audio_url?: string | null;
          transcript?: string | null;
          script_json?: Json | null;
          status?: StoryStatus;
          comic_url?: string | null;
          print_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          capsule_id?: string;
          author_member_id?: string | null;
          source?: StorySource;
          panel_count?: number;
          audio_url?: string | null;
          transcript?: string | null;
          script_json?: Json | null;
          status?: StoryStatus;
          comic_url?: string | null;
          print_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stories_capsule_id_fkey";
            columns: ["capsule_id"];
            referencedRelation: "capsules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stories_author_member_id_fkey";
            columns: ["author_member_id"];
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      deliveries: {
        Row: {
          id: string;
          story_id: string;
          device_id: string;
          status: DeliveryStatus;
          printed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          device_id: string;
          status?: DeliveryStatus;
          printed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          device_id?: string;
          status?: DeliveryStatus;
          printed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deliveries_story_id_fkey";
            columns: ["story_id"];
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_device_id_fkey";
            columns: ["device_id"];
            referencedRelation: "devices";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      story_source: StorySource;
      story_status: StoryStatus;
      delivery_status: DeliveryStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};

// Shorthands for the rest of the app, so features import a name, not a path
// through Database["public"]["Tables"].
type Tables = Database["public"]["Tables"];

export type Capsule = Tables["capsules"]["Row"];
export type Member = Tables["members"]["Row"];
export type Device = Tables["devices"]["Row"];
export type Story = Tables["stories"]["Row"];
export type Delivery = Tables["deliveries"]["Row"];

export type CapsuleInsert = Tables["capsules"]["Insert"];
export type MemberInsert = Tables["members"]["Insert"];
export type DeviceInsert = Tables["devices"]["Insert"];
export type StoryInsert = Tables["stories"]["Insert"];
export type DeliveryInsert = Tables["deliveries"]["Insert"];

/** Buckets created by the migration. */
export const BUCKET_AUDIO = "audio";
export const BUCKET_COMICS = "comics";
