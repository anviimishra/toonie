/** Minimal two-way messaging schema; paths belong to the private media bucket. */
export type MessageSenderRole = "parent" | "child";
export type ParentChildPair = {
  id: string;
  parent_id: string;
  child_id: string;
  created_at: string;
};

export type ComicMessage = {
  id: string;
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

export type MessagingTables = {
  parent_child_pairs: {
    Row: ParentChildPair;
    Insert: Pick<ParentChildPair, "parent_id" | "child_id"> &
      Partial<Pick<ParentChildPair, "id" | "created_at">>;
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
