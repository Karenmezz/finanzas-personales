export function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details open className="group min-w-0">
      <summary className="mb-3 flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:hidden">
        <span>{title}</span>
        <span className="font-normal text-slate-500 group-open:hidden">Mostrar</span>
        <span className="hidden font-normal text-slate-500 group-open:inline">Ocultar</span>
      </summary>
      <div className="hidden group-open:block sm:!block">{children}</div>
    </details>
  );
}
