import { Download, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'

export function DataTableToolbar({
  searchQuery,
  onSearchQueryChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
  totalRows,
  visibleRows,
  onExportXlsx,
  extraActions,
}: {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  pageSize: number
  onPageSizeChange: (value: number) => void
  pageSizeOptions: number[]
  totalRows: number
  visibleRows: number
  onExportXlsx?: () => void
  extraActions?: ReactNode
}) {
  const { t } = useLanguage()

  return (
    <div className="data-table-toolbar">
      <label className="search-field data-table-search">
        <Search size={15} />
        <input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={t('table.searchPlaceholder')}
        />
      </label>
      <div className="data-table-toolbar-meta">
        <span>{visibleRows}/{totalRows}</span>
      </div>
      <div className="data-table-toolbar-actions">
        <label className="data-table-page-size">
          <span>{t('table.rowsPerPage')}</span>
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {pageSizeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {extraActions}
        {onExportXlsx ? (
          <button className="ghost-btn" type="button" onClick={onExportXlsx}>
            <Download size={15} /> {t('table.exportXlsx')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
