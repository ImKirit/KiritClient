export default function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}): React.JSX.Element {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-edge px-6 py-4">
      <div>
        <h1 className="text-[17px] leading-tight font-black tracking-[0.3px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  )
}
