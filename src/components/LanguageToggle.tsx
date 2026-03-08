import { useLanguage } from '@/lib/language-context';
import { Button } from '@/components/ui/button';

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
      className="text-xs font-medium tracking-wide"
    >
      {lang === 'en' ? 'हिंदी' : 'English'}
    </Button>
  );
}
