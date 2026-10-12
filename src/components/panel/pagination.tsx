import Link from "next/link";

export function Pagination({
  page,
  pages,
  total,
  basePath,
  params = {},
}: {
  page: number;
  pages: number;
  total: number;
  basePath: string;
  params?: Record<string, string>;
}) {
  if (pages <= 1) return <p className="border-t border-line px-5 py-3 text-xs text-muted">{total} resultado(s)</p>;
  const href = (p: number) => {
    const q = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)), pagina: String(p) });
    return `${basePath}?${q.toString()}`;
  };
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm">
      <span className="text-muted">
        Página {page} de {pages} · {total} resultado(s)
      </span>
      <span className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-primary">
            Anterior
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-primary">
            Siguiente
          </Link>
        ) : null}
      </span>
    </nav>
  );
}
