import React from 'react';
import { useTranslation } from 'react-i18next';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Languages } from 'lucide-react';
import { cn, formatError } from '@/lib/utils.ts';
import { languages, type SupportedLanguage } from '@/i18n/config.ts';
import { logger } from '@/lib/logger.ts';
import toast from 'react-hot-toast';
import { useAppSettings } from "@/modules/use-app-settings.ts";

interface LanguageSwitcherProps {
  className?: string;
  showNativeName?: boolean;
}

export const LanguageDropdown: React.FC<LanguageSwitcherProps> = ({
  className,
  showNativeName = true,
}) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = React.useState(false);
  const setLanguage = useAppSettings(state => state.setLanguage);

  const currentLanguage = i18n.language as SupportedLanguage;

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    if (newLanguage === currentLanguage) return;

    setLoading(true);
    try {
      await setLanguage(newLanguage);
      toast.success(i18n.t('settings:language.changeSuccess'));
      logger.info('Language changed', {
        module: 'LanguageDropdown',
        from: currentLanguage,
        to: newLanguage,
      });
    } catch (error) {
      toast.error(i18n.t('settings:language.changeError'));
      logger.error('Failed to change language', {
        module: 'LanguageDropdown',
        error: formatError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "app-toolbar-pill h-10 w-10 justify-center rounded-xl p-0 transition-colors duration-200 ease-in-out cursor-pointer",
            "text-muted-foreground hover:text-foreground hover:bg-accent/70",
            className
          )}
          title={t('settings:language.change')}
          disabled={loading}
        >
          <Languages className="w-5 h-5" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[140px] overflow-hidden rounded-xl border border-border/70 bg-card/95 p-1 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.4)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {languages.map((lang) => (
            <DropdownMenu.Item
              key={lang.code}
              onSelect={() => handleLanguageChange(lang.code)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors',
                'text-foreground hover:bg-accent/70 focus:bg-accent/70',
                lang.code === currentLanguage && 'bg-accent/50 font-medium'
              )}
            >
              <span>{lang.flag}</span>
              <span>{showNativeName ? lang.nativeName : lang.name}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
