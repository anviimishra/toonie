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
  thumbnail_path: string | null;
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

type ServerTable<T> = { Row: T; Insert: T; Update: Partial<T>; Relationships: [] };
export type MessagingTables = {
  comic_jobs: {
    Row: {
      id: string;
      user_id: string;
      status: "working" | "ready" | "failed";
      stage: string;
      drawn: number;
      panel_count: number;
      result: import("./types").Json | null;
      audio_path: string | null;
      audio_type: string | null;
      audio_duration_ms: number | null;
      original_transcript: string | null;
      error: string | null;
      archived: boolean;
      created_at: string;
    };
    Insert: {
      id: string;
      user_id: string;
      status: string;
      stage: string;
      panel_count: number;
      audio_duration_ms?: number | null;
    };
    Update: Partial<MessagingTables["comic_jobs"]["Row"]>;
    Relationships: [];
  };
  pairing_codes: ServerTable<{
    code_hash: string;
    parent_id: string;
    child_name: string;
    child_avatar_reference: string;
    expires_at: string;
    claimed_child_id: string | null;
    pair_id: string | null;
  }>;
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
