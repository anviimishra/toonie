/** Minimal two-way messaging schema; paths belong to the private media bucket. */
export type MessageSenderRole = "parent" | "child";
export type ParentChildPair = {
  id: string;
  child_name: string;
  child_avatar_reference: string | null;
  parent_id: string;
  child_id: string;
  created_at: string;
};

export type ComicMessage = {
  id: string;
  content_hash: string | null;
  pair_id: string;
  sender_role: MessageSenderRole;
  title: string;
  /** Always present: typed story or speech-to-text, including user corrections. */
  transcript: string;
  original_transcript: string | null;
  comic_path: string;
  print_path: string | null;
  audio_path: string | null;
  audio_mime_type: string | null;
  audio_duration_ms: number | null;
  panel_count: number;
  created_at: string;
  read_at: string | null;
};

export type ComicMessageInsert = Pick<
  ComicMessage,
  "pair_id" | "sender_role" | "title" | "transcript" | "comic_path" | "panel_count"
> &
  Partial<
    Omit<
      ComicMessage,
      "pair_id" | "sender_role" | "title" | "transcript" | "comic_path" | "panel_count"
    >
  >;

/** One person's settings within a pair: see migrations/*_family_members.sql. */
export type FamilyMember = {
  pair_id: string;
  role: MessageSenderRole;
  /** ISO 639-1 code from LANGUAGES. */
  language: string;
  /** Inline image used as the comic character reference, or null. */
  avatar_reference: string | null;
  /** The avatar builder recipe, for re-editing on another device. */
  avatar_config: Record<string, unknown> | null;
  /** Parent only: when they agreed to have their voice cloned for read-alouds. */
  voice_consent_at: string | null;
  /** Parent only: the provider's id for their cloned voice. Server-managed. */
  voice_id: string | null;
  updated_at: string;
};

/** A story translated and spoken for the recipient; see *_voiceovers.sql. */
export type MessageVoiceover = {
  message_id: string;
  language: string;
  text: string;
  /** In the private message-media bucket. */
  audio_path: string;
  created_at: string;
};

type ServerTable<T> = { Row: T; Insert: T; Update: Partial<T>; Relationships: [] };
export type MessagingTables = {
  pairing_codes: ServerTable<{
    code_hash: string;
    parent_id: string;
    child_name: string;
    child_avatar_reference: string;
    expires_at: string;
    claimed_child_id: string | null;
    pair_id: string | null;
  }>;
  family_members: {
    Row: FamilyMember;
    Insert: Pick<FamilyMember, "pair_id" | "role"> &
      Partial<Omit<FamilyMember, "pair_id" | "role">>;
    Update: Partial<FamilyMember>;
    Relationships: [
      {
        foreignKeyName: "family_members_pair_id_fkey";
        columns: ["pair_id"];
        isOneToOne: false;
        referencedRelation: "parent_child_pairs";
        referencedColumns: ["id"];
      },
    ];
  };
  message_voiceovers: {
    Row: MessageVoiceover;
    Insert: Omit<MessageVoiceover, "created_at"> & { created_at?: string };
    Update: Partial<MessageVoiceover>;
    Relationships: [
      {
        foreignKeyName: "message_voiceovers_message_id_fkey";
        columns: ["message_id"];
        isOneToOne: false;
        referencedRelation: "comic_messages";
        referencedColumns: ["id"];
      },
    ];
  };
  request_limits: ServerTable<{ key: string; started_at: string; attempts: number }>;
  parent_child_pairs: {
    Row: ParentChildPair;
    Insert: Pick<ParentChildPair, "parent_id" | "child_id"> &
      Partial<Pick<ParentChildPair, "id" | "created_at" | "child_name" | "child_avatar_reference">>;
    Update: Partial<ParentChildPair>;
    Relationships: [];
  };
  comic_messages: {
    Row: ComicMessage;
    Insert: ComicMessageInsert;
    Update: Partial<ComicMessage>;
    Relationships: [
      {
        foreignKeyName: "comic_messages_pair_id_fkey";
        columns: ["pair_id"];
        isOneToOne: false;
        referencedRelation: "parent_child_pairs";
        referencedColumns: ["id"];
      },
    ];
  };
};

export const BUCKET_MESSAGE_MEDIA = "message-media";

export function messageRecipient(pair: ParentChildPair, sender: MessageSenderRole): string {
  return sender === "parent" ? pair.child_id : pair.parent_id;
}
