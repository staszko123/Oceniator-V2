import { ChevronLeft, ChevronRight } from 'lucide-react'

export function DataTablePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="data-table-pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft size={15} />
      </button>
      <span>{page} / {totalPages || 1}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        <ChevronRight size={15} />
      </button>
    </div>
  )
}
