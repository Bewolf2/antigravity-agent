import React from 'react';
import { ArrowUpDown, Search, X } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils.ts';
import { BaseInput } from '@/components/base-ui/BaseInput';
import type { UserTier } from '@/modules/use-account-data-store.ts';
import { Tooltip } from '@/components/ui/tooltip';
import UpdateBadge from "@/components/business/UpdateBadge.tsx";
import { useTranslation } from 'react-i18next';
import { LanguageDropdown } from '@/components/business/LanguageDropdown.tsx';
import { useAntigravityAccount } from '@/modules/use-antigravity-account.ts';
import { AccountTriggerCommands } from '@/commands/AccountTriggerCommands.ts';
import toast from 'react-hot-toast';
import { Flame } from "lucide-react";
import { logger } from '@/lib/logger';

export type ListSortKey = 'name' | 'claude' | 'gemini-pro' | 'gemini-flash' | 'gemini-image' | 'tier';
export type ListToolbarValue = {
  query: string;
  sortKey: ListSortKey;
  tiers: UserTier[] | null;
};

const useSortOptions = () => {
  const { t } = useTranslation('dashboard');
  return React.useMemo<Array<{ value: ListSortKey; label: string }>>(() => [
    { value: 'name', label: t('sort.name') },
    { value: 'gemini-pro', label: t('sort.geminiPro') },
    { value: 'claude', label: t('sort.claude') },
    { value: 'gemini-flash', label: t('sort.geminiFlash') },
    { value: 'gemini-image', label: t('sort.geminiImage') },
    { value: 'tier', label: t('sort.tier') },
  ], [t]);
};

// Use a hook or component to get dynamic translations for map values
const useTierUiMap = () => {
  const { t } = useTranslation('common');
  return React.useMemo<Record<UserTier, { label: string; accentClass: string }>>(() => ({
    'free-tier': {
      label: t('tier.free'),
      accentClass: 'text-foreground',
    },
    'g1-pro-tier': {
      label: t('tier.pro'),
      accentClass: 'text-amber-600 dark:text-amber-300',
    },
    'g1-ultra-tier': {
      label: t('tier.ultra'),
      accentClass: 'text-violet-600 dark:text-violet-300',
    },
  }), [t]);
};

const allTiers: UserTier[] = ['free-tier', 'g1-pro-tier', 'g1-ultra-tier'];

export interface BusinessListToolbarProps {
  /** 列表总数 */
  total: number;
  /** 搜索关键字 */
  query: string;
  /** 排序 key */
  sortKey: ListSortKey;
  /** 任一项变更时回调（返回完整状态） */
  onChange: (next: ListToolbarValue) => void;
  className?: string;
  // 为 null 时，显示所有层次
  tiers?: UserTier[] | null;
}

// ==========================================
// 子元件: 搜索框
// ==========================================
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, onChange }) => {
  const { t } = useTranslation('dashboard');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <BaseInput
      value={value}
      onChange={handleChange}
      placeholder={t('toolbar.searchPlaceholder')}
      leftIcon={<Search className="h-4 w-4" />}
      rightIcon={
        value ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : undefined
      }
      containerClassName="w-full max-w-full !space-y-0 md:w-72 lg:w-80"
      className="h-10 rounded-xl border-border/70 bg-input/80 py-2 text-sm shadow-none"
    />
  );
};

// ==========================================
// 子元件: 层级篩選器
// ==========================================
interface TierFilterProps {
  selectedTiers: UserTier[];
  onChange: (tiers: UserTier[] | null) => void;
}

const TierFilter: React.FC<TierFilterProps> = ({ selectedTiers, onChange }) => {
  const { t } = useTranslation('common');
  const tierUiMap = useTierUiMap();

  const handleToggleTier = (tier: UserTier) => {
    const exists = selectedTiers.includes(tier);
    const nextTiers = exists
      ? selectedTiers.filter(t => t !== tier)
      : [...selectedTiers, tier];

    const nextNormalized =
      nextTiers.length === 0 || nextTiers.length === allTiers.length
        ? null
        : nextTiers;

    onChange(nextNormalized);
  };

  const handleClearTiers = () => {
    onChange(null);
  };

  return (
    <div className={cn('app-toolbar-pill flex-wrap p-1')}>
      <button
        type="button"
        onClick={handleClearTiers}
        className={cn(
          'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
          selectedTiers.length === 0
            ? 'bg-card text-primary shadow-sm'
            : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
        )}
      >
        {t('tier.all')}
      </button>
      {allTiers.map(tier => {
        const isActive = selectedTiers.includes(tier);
        const { label, accentClass } = tierUiMap[tier];
        return (
          <button
            key={tier}
            type="button"
            onClick={() => handleToggleTier(tier)}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
              isActive
                ? cn('bg-card shadow-sm', accentClass)
                : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

// ==========================================
// 子元件: 排序選擇器
// ==========================================
interface SortSelectorProps {
  value: ListSortKey;
  onChange: (key: ListSortKey) => void;
}

const SortSelector: React.FC<SortSelectorProps> = ({ value, onChange }) => {
  const sortOptions = useSortOptions();
  const currentLabel = sortOptions.find(opt => opt.value === value)?.label ?? '';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="app-toolbar-pill h-10 gap-1.5 px-3 cursor-pointer text-foreground hover:bg-accent/70 transition-colors duration-200"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs">{currentLabel}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-border/70 bg-card/95 p-1 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.4)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {sortOptions.map(opt => (
            <DropdownMenu.Item
              key={opt.value}
              onSelect={() => onChange(opt.value)}
              className={cn(
                'flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors',
                'text-foreground hover:bg-accent/70 focus:bg-accent/70',
                opt.value === value && 'bg-accent/50 font-medium'
              )}
            >
              {opt.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

// ==========================================
// 子元件: 刷新按鈕
// ==========================================
interface RefreshButtonProps {
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({ isRefreshing, onRefresh }) => {
  const { t } = useTranslation('dashboard');

  return (
    <Tooltip
      content={<div className="whitespace-pre-wrap">{t('toolbar.refreshQuotaTooltip')}</div>}
    >
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className={cn(
          "app-toolbar-pill h-10 w-10 justify-center rounded-xl p-0 transition-colors relative",
          "hover:bg-accent/70",
          isRefreshing ? "cursor-not-allowed opacity-70" : "cursor-pointer"
        )}
      >
        <Flame className={cn("h-4 w-4 text-amber-500", isRefreshing && "animate-pulse")} />
      </button>
    </Tooltip>
  );
};

// ==========================================
// 主元件
// ==========================================
/**
 * Business Component: ListToolbar
 * 列表顶部工具栏（标题 + 搜索 + 自定义动作/过滤器插槽）
 */
const AccountsListToolbar: React.FC<BusinessListToolbarProps> = ({
  total,
  query,
  sortKey,
  onChange,
  className,
  tiers,
}) => {
  const { t } = useTranslation('dashboard');
  const normalizedTiers = tiers && tiers.length > 0 ? tiers : null;
  const selectedTiers = normalizedTiers ?? [];

  const { accounts } = useAntigravityAccount();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefreshAll = async () => {
    if (isRefreshing) return;
    if (accounts.length === 0) {
      toast.error(t('toolbar.noAccounts'));
      return;
    }

    setIsRefreshing(true);
    const toastId = toast.loading(t('toolbar.refreshingQuota'));
    let triggeredCount = 0;

    try {
      const chunk = (arr: typeof accounts, size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size)
        );

      const batches = chunk(accounts, 3);

      for (const batch of batches) {
        const promises = batch.map(acc => {
          const email = acc.antigravity_auth_status.email;
          logger.info("REFRESH: Triggering for", email);
          toast(t('toolbar.refreshingQuota') + ' ' + email, { id: 'refresh-' + email });

          return AccountTriggerCommands.triggerQuotaRefresh(email)
            .then(res => {
              logger.info("REFRESH: Result for", email, res);
              if (res.triggered_models.length > 0) {
                toast.success(`Done ${email}: ${res.triggered_models.length} triggered`, { duration: 3000 });
              }

              if (res.failed_models && res.failed_models.length > 0) {
                toast.error(`Errors ${email}: ${res.failed_models.join(", ")}`, { duration: 5000 });
              }

              if (res.triggered_models.length === 0 && (!res.failed_models || res.failed_models.length === 0)) {
                const reasons = res.skipped_details && res.skipped_details.length > 0
                  ? res.skipped_details.join(", ")
                  : "Unknown";
                toast(`Skipped ${email}: ${reasons}`, { icon: 'ℹ️', duration: 5000 });
              }

              if (res.triggered_models.length > 0) {
                triggeredCount += res.triggered_models.length;
              }
              return res;
            })
            .catch(e => {
              logger.error("Refresh failed for", email, e);
              toast.error(`Fail ${email}: ${e}`, { duration: 3000 });
              return null;
            })
        });
        await Promise.all(promises);
      }

      toast.success(t('toolbar.refreshComplete', { count: triggeredCount }), { id: toastId });
    } catch (e) {
      toast.error(t('toolbar.refreshError'), { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearchChange = (value: string) => {
    onChange({ query: value, sortKey, tiers: normalizedTiers });
  };

  const handleSortChange = (next: ListSortKey) => {
    onChange({ query, sortKey: next, tiers: normalizedTiers });
  };

  const handleTierChange = (nextTiers: UserTier[] | null) => {
    onChange({ query, sortKey, tiers: nextTiers });
  };

  const containerClasses = [
    'app-panel relative flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between',
  ];

  return (
    <div className={cn(...containerClasses, className)}>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="app-toolbar-pill rounded-full px-2.5 py-1">
            <span className="text-xs font-medium text-muted-foreground">
              {t('toolbar.accounts')}
            </span>
            <span className="flex min-w-[24px] items-center justify-center rounded-full bg-card px-1.5 py-0.5 text-xs font-semibold text-foreground shadow-sm">
              {total}
            </span>
          </div>
          <UpdateBadge />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:justify-end">
        <SearchInput value={query} onChange={handleSearchChange} />
        <TierFilter selectedTiers={selectedTiers} onChange={handleTierChange} />
        <SortSelector value={sortKey} onChange={handleSortChange} />

        {/* 语言切换器 */}
        <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
        <LanguageDropdown />

        {/* 刷新按钮 */}
        <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
        <RefreshButton isRefreshing={isRefreshing} onRefresh={handleRefreshAll} />
      </div>
    </div>
  );
};

export default AccountsListToolbar;
