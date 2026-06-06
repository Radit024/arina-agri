// Shared types for Telegram/WhatsApp inbound chat input processing.

export type ChatInputChannel = 'telegram' | 'whatsapp';

// ─── Inbound Message ──────────────────────────────────────────────────────────

export interface InboundChatMessage {
  channel: ChatInputChannel;
  /** Unique message ID from the platform, used for idempotency. */
  externalMessageId: string;
  /** Platform-specific sender identifier (Telegram chat.id or WhatsApp from number). */
  senderId: string;
  senderDisplayName?: string;
  text: string;
  receivedAt: string; // ISO 8601
  /** The platform identifier to send the reply to (same as senderId in most cases). */
  replyTo: string;
}

// ─── Parsed Commands ──────────────────────────────────────────────────────────

export interface FinanceCommand {
  type: 'finance';
  jenis: 'pengeluaran' | 'pendapatan';
  kategori: string;
  nominal: number;
  keterangan: string;
}

export interface StockInCommand {
  type: 'stock_in';
  berat: number;
  grade: 'A' | 'B' | 'C';
  hargaModal: number;
  hargaJual: number;
  lokasiPenyimpanan: 'Gudang Utama' | 'Gudang Cadangan';
  estimasiKadaluarsa: string; // YYYY-MM-DD
  catatan: string;
}

export interface StockOutCommand {
  type: 'stock_out';
  batchCode: string;
  berat: number;
  tujuan: 'Pasar Lokal' | 'Distributor' | 'Restoran' | 'Lainnya';
  catatan: string;
}

export interface UtilityCommand {
  type: 'utility';
  name: 'start' | 'help' | 'hubungkan' | 'profil' | 'ringkasan' | 'batch' | 'batal';
}

export interface CategoryListCommand {
  type: 'category_list';
  jenis?: FinanceCommand['jenis'];
}

export interface CategoryCreateCommand {
  type: 'category_create';
  jenis: FinanceCommand['jenis'];
  name: string;
  aliases: string[];
}

export interface CategoryAliasCommand {
  type: 'category_alias';
  jenis: FinanceCommand['jenis'];
  name: string;
  aliases: string[];
}

export type CategoryCommand = CategoryListCommand | CategoryCreateCommand | CategoryAliasCommand;

export type ParsedChatCommand = FinanceCommand | StockInCommand | StockOutCommand | UtilityCommand | CategoryCommand;

export type ParseResult =
  | { ok: true; command: ParsedChatCommand }
  | { ok: false; message: string };

// ─── Identity ─────────────────────────────────────────────────────────────────

export interface ResolvedChatUser {
  id: string;
  displayName: string;
}

// ─── Processor Result ─────────────────────────────────────────────────────────

export interface ProcessChatInputResult {
  success: boolean;
  status: 'processed' | 'ignored' | 'failed';
  replyText: string;
}
