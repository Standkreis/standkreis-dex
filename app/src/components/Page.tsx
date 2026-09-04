import { useTranslations } from 'next-intl'

// Every tab in M2 is this: a title and one "kommt bald" line. Proves routing, theme and i18n per screen.
export function Page({ title }: { title: string }) {
  const t = useTranslations('common')
  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-3 pb-24">
      <div className="flex h-10 items-center">
        <h1 className="text-[28px] leading-none font-bold tracking-tight">{title}</h1>
      </div>
      <p className="mt-3 text-[15px] text-ink-soft">{t('comingSoon')}</p>
    </main>
  )
}
