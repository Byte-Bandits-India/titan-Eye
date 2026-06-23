import type { Alignment, Borders, FillPattern, Font, Location } from 'exceljs'
import { get } from 'lodash'
import type { FieldValues, Path } from 'react-hook-form'

export type ExcelColumn<RecordType extends FieldValues = FieldValues> = {
  title: string
  dataIndex?: Path<RecordType>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: RecordType) => string | number
  children?: ExcelColumn<RecordType>[]
  dontShow?: boolean
  getCellStyle?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    row: RecordType
  ) => {
    font?: Partial<Font>
    fill?: Partial<FillPattern>
    numFmt?: string
    alignment?: Partial<Alignment>
    border?: Partial<Borders>
  }
  headerStyle?: {
    font?: Partial<Font>
    fill?: Partial<FillPattern>
    numFmt?: string
    alignment?: Partial<Alignment>
    border?: Partial<Borders>
  }
}

function buildGroupedHeaders<RecordType extends FieldValues>(
  columns: ExcelColumn<RecordType>[]
): {
  headerRows: ExcelColumn<RecordType>[][]
  leafColumns: ExcelColumn<RecordType>[]
  merges: Location[]
} {
  const maxDepth = getMaxDepth(columns)
  const rows: ExcelColumn<RecordType>[][] = Array.from({ length: maxDepth }, () => [])
  const merges: Location[] = []
  const leafColumns: ExcelColumn<RecordType>[] = []

  const colStart = { value: 0 }

  const fill = (cols: ExcelColumn<RecordType>[], depth: number): number => {
    let span = 0

    for (const col of cols) {
      const start = colStart.value

      if (col.children && col.children.length > 0) {
        const childSpan = fill(col.children, depth + 1)
        rows[depth].push(col, ...Array(childSpan - 1).fill({ title: '' }))
        merges.push({
          top: depth + 1,
          left: start + 1,
          bottom: depth + 1,
          right: start + childSpan
        })
        span += childSpan
      } else {
        rows[depth].push(col)

        for (let i = depth + 1; i < maxDepth; i++) {
          rows[i].push({ title: '' })
        }

        merges.push({
          top: depth + 1,
          left: colStart.value + 1,
          bottom: maxDepth,
          right: colStart.value + 1
        })
        leafColumns.push(col)
        colStart.value++
        span++
      }
    }

    return span
  }

  fill(columns, 0)

  return { headerRows: rows, leafColumns, merges }
}

function getMaxDepth<RecordType extends FieldValues>(cols: ExcelColumn<RecordType>[]): number {
  return Math.max(...cols.map((col) => (col.children?.length ? 1 + getMaxDepth(col.children) : 1)))
}

/**
 * Converts data to an Excel file and triggers a download.
 *
 * @param rows - The column definitions for the Excel sheet.
 * @param values - The data to be included in the Excel sheet.
 * @param name - The name of the downloaded Excel file.
 */
export const convertToExcel = <RecordType extends FieldValues = FieldValues>(
  rows: ExcelColumn<RecordType>[] = [],
  values: RecordType[] = [],
  name = 'Excel'
) => {
  const getRows = (rows: ExcelColumn<RecordType>[]): ExcelColumn<RecordType>[] =>
    rows
      .filter((col) => !col.dontShow)
      .map((col) => {
        if (col.children && col.children.length > 0) {
          return {
            ...col,
            children: getRows(col.children)
          }
        }

        return col
      })

  const { headerRows, leafColumns, merges } = buildGroupedHeaders(getRows(rows))

  import('exceljs').then((ExcelJS) => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Sheet1')

    headerRows.forEach((row, rowIndex) => {
      const excelRow = worksheet.getRow(rowIndex + 1)
      row.forEach((cell, colIndex) => {
        const excelCell = excelRow.getCell(colIndex + 1)
        excelCell.value = cell.title

        if (cell.headerStyle) {
          const style = cell.headerStyle

          if (style.fill) {
            excelCell.fill = style.fill
              ? { ...{ type: 'pattern', pattern: 'solid' }, ...style.fill }
              : { type: 'pattern', pattern: 'solid' }
          }

          if (style.numFmt) {
            excelCell.numFmt = style.numFmt
          }

          excelCell.font = {
            ...(style.font || {}),
            color: style.font?.color
          }
          excelCell.alignment = style.alignment || {}
          excelCell.border = style.border || {}
        }
      })
    })

    // Add data rows
    values.forEach((record, rowIndex) => {
      const row = worksheet.getRow(headerRows.length + rowIndex + 1)
      leafColumns.forEach((col, colIndex) => {
        const raw = get(record, col.dataIndex || '')
        const value = col.render?.(raw, record) ?? raw ?? ''

        const cell = row.getCell(colIndex + 1)
        cell.value = value

        // Optional per-cell style
        if (col.getCellStyle) {
          const style = col.getCellStyle(raw, record)

          if (style.fill) {
            cell.fill = style.fill
              ? { ...{ type: 'pattern', pattern: 'solid' }, ...style.fill }
              : { type: 'pattern', pattern: 'solid' }
          }

          if (style.numFmt) {
            cell.numFmt = style.numFmt
          }

          cell.font = {
            ...(style.font || {}),
            color: style.font?.color
          }
          cell.alignment = style.alignment || {}
          cell.border = style.border || {}
        }
      })
    })

    // Apply merges
    merges.forEach((loc) => {
      worksheet.mergeCells(loc)
    })

    // Auto width
    worksheet.columns.forEach((col, i) => {
      const values = worksheet.getColumn(i + 1).values.slice(headerRows.length) // skip index 0
      const maxLength = Math.max(...values.filter((x) => x).map((v) => (v ? String(v).length : 0)))
      col.width = Math.max(maxLength + 2, 10) // add padding and enforce min width
    })

    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${name}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
    })
  })
}
