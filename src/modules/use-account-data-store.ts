import { create } from "zustand";
import { AntigravityAccount } from "@/commands/types/account.types.ts";
import { AccountCommands } from "@/commands/AccountCommands.ts";
import { logger } from "@/lib/logger";

// ============ 類型定義 ============

export type UserTier = 'free-tier' | 'g1-pro-tier' | 'g1-ultra-tier';

export interface AccountAdditionData {
  geminiProQuote: number
  geminiProQuoteRestIn: string
  geminiFlashQuote: number
  geminiFlashQuoteRestIn: string
  geminiImageQuote: number
  geminiImageQuoteRestIn: string
  claudeQuote: number
  claudeQuoteRestIn: string
  userAvatar: string
  userId: string
  projectId: string | null
  lastUpdatedAt: number
}

interface AccountMeta {
  nickname?: string;
  notes?: string;
}

interface State {
  // 額外資料（配額、頭像等）
  additionData: Record<string, AccountAdditionData>
  // 元資料（昵稱、備註等）
  metadata: Record<string, AccountMeta>
}

interface Actions {
  // 額外資料操作
  updateAdditionData: (antigravityAccount: AntigravityAccount) => Promise<void>

  // 元資料操作
  setNickname: (email: string, nickname: string) => void;
  setNotes: (email: string, notes: string) => void;
  getMeta: (email: string) => AccountMeta;
}

// ============ localStorage 工具 ============

const METADATA_STORAGE_KEY = 'account_metadata';

function loadMetadataFromStorage(): Record<string, AccountMeta> {
  try {
    const raw = localStorage.getItem(METADATA_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveMetadataToStorage(metadata: Record<string, AccountMeta>) {
  try {
    localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(metadata));
  } catch {}
}

// ============ Zustand Store ============

export const useAccountDataStore = create<State & Actions>((set, get) => ({
  // 初始狀態
  additionData: {},
  metadata: loadMetadataFromStorage(),

  // ========== 額外資料操作 ==========
  updateAdditionData: async (antigravityAccount: AntigravityAccount) => {
    const email = antigravityAccount.antigravity_auth_status.email;

    try {
      logger.debug(`开始获取账户指标 (Rust Singular): ${email}`);

      const metric = await AccountCommands.getAccountMetrics(email);

      // 映射 Rust 数据结构 -> 前端 Store 结构
      // 注意：后端返回的 quotas 数组需要转换为具名字段
      const findQuota = (name: string) => {
        const item = metric.quotas.find(q => q.model_name.includes(name));
        return {
          percentage: item ? item.percentage : -1,
          resetText: item ? item.reset_text : ""
        };
      };

      const geminiPro = findQuota("Gemini Pro");
      const geminiFlash = findQuota("Gemini Flash");
      const geminiImage = findQuota("Gemini Image");
      const claude = findQuota("Claude");

      logger.debug(`获取账户指标成功 (Rust Singular): ${email}`);

      set({
        additionData: {
          ...get().additionData,
          [email]: {
            geminiProQuote: geminiPro.percentage,
            geminiProQuoteRestIn: geminiPro.resetText,
            geminiFlashQuote: geminiFlash.percentage,
            geminiFlashQuoteRestIn: geminiFlash.resetText,
            geminiImageQuote: geminiImage.percentage,
            geminiImageQuoteRestIn: geminiImage.resetText,
            claudeQuote: claude.percentage,
            claudeQuoteRestIn: claude.resetText,
            userAvatar: metric.avatar_url,
            userId: metric.user_id,
            projectId: metric.project_id,
            lastUpdatedAt: Date.now(),
          }
        }
      });

    } catch (error) {
      logger.error(`获取账户指标失败 (Rust): ${email}`, error);
    }
  },

  // ========== 元資料操作 ==========
  setNickname: (email, nickname) => {
    const metadata = {
      ...get().metadata,
      [email]: { ...get().metadata[email], nickname: nickname.trim() || undefined }
    };
    saveMetadataToStorage(metadata);
    set({ metadata });
  },

  setNotes: (email, notes) => {
    const metadata = {
      ...get().metadata,
      [email]: { ...get().metadata[email], notes: notes.trim() || undefined }
    };
    saveMetadataToStorage(metadata);
    set({ metadata });
  },

  getMeta: (email) => get().metadata[email] ?? {},
}));
