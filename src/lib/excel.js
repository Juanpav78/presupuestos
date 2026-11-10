// Lectura y escritura de archivos Excel (.xlsx) y CSV sin dependencias pesadas.
import JSZip from 'jszip'

const NS = '*'
const xml = (txt) => new DOMParser().parseFromString(txt, 'application/xml')
const etiquetas = (nodo, nombre) => Array.from(nodo.getElementsByTagNameNS(NS, nombre))

const columnaAIndice = (ref) => {
  const letras = ref.replace(/[0-9]/g, '')
  return letras.split('').reduce((n, l) => n * 26 + (l.charCodeAt(0) - 64), 0) - 1
}

/** Fecha serial de Excel (días desde 1899-12-30) a 'YYYY-MM-DD'. */
export const serialAFecha = (n) => {
  const d = new Date(Math.round((Number(n) - 25569) * 86400 * 1000))
  return d.toISOString().slice(0, 10)
}

/** Lee un .xlsx o .csv y devuelve { NombreHoja: [[celdas]] } */
export async function leerArchivo(archivo) {
  const nombre = archivo.name.toLowerCase()
  if (nombre.endsWith('.csv') || nombre.endsWith('.txt')) {
    return { [archivo.name.replace(/\.\w+$/, '')]: leerCSV(await archivo.text()) }
  }
  const zip = await JSZip.loadAsync(await archivo.arrayBuffer())
  const leerXml = async (ruta) => {
    const f = zip.file(ruta)
    return f ? xml(await f.async('string')) : null
  }

  const compartidos = []
  const ss = await leerXml('xl/sharedStrings.xml')
  if (ss) etiquetas(ss, 'si').forEach((si) => compartidos.push(etiquetas(si, 't').map((t) => t.textContent).join('')))

  const libro = await leerXml('xl/workbook.xml')
  const rels = await leerXml('xl/_rels/workbook.xml.rels')
  if (!libro) throw new Error('No es un archivo de Excel válido')
  const destinos = {}
  if (rels) etiquetas(rels, 'Relationship').forEach((r) => (destinos[r.getAttribute('Id')] = r.getAttribute('Target')))

  const hojas = {}
  for (const [i, h] of etiquetas(libro, 'sheet').entries()) {
    const rid = h.getAttribute('r:id') || h.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
    let destino = destinos[rid] || `worksheets/sheet${i + 1}.xml`
    destino = destino.replace(/^\/?xl\//, '').replace(/^\//, '')
    const hoja = await leerXml(`xl/${destino}`)
    if (!hoja) continue
    const filas = []
    etiquetas(hoja, 'row').forEach((row) => {
      const fila = []
      etiquetas(row, 'c').forEach((c, j) => {
        const ref = c.getAttribute('r')
        const col = ref ? columnaAIndice(ref) : j
        const tipo = c.getAttribute('t')
        const v = etiquetas(c, 'v')[0]?.textContent
        let valor
        if (tipo === 's') valor = compartidos[Number(v)]
        else if (tipo === 'inlineStr') valor = etiquetas(c, 't').map((t) => t.textContent).join('')
        else if (tipo === 'b') valor = v === '1'
        else if (tipo === 'str' || tipo === 'e') valor = v
        else valor = v !== undefined && v !== '' ? Number(v) : undefined
        fila[col] = valor
      })
      const r = Number(row.getAttribute('r')) - 1
      filas[Number.isFinite(r) && r >= 0 ? r : filas.length] = fila
    })
    hojas[h.getAttribute('name')] = filas.filter(Boolean)
  }
  return hojas
}

export function leerCSV(texto) {
  const primera = texto.split(/\r?\n/)[0] || ''
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ','
  const filas = []
  let fila = []
  let celda = ''
  let comillas = false
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') { celda += '"'; i++ }
      else if (ch === '"') comillas = false
      else celda += ch
    } else if (ch === '"') comillas = true
    else if (ch === sep) { fila.push(celda); celda = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++
      fila.push(celda); filas.push(fila); fila = []; celda = ''
    } else celda += ch
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila) }
  return filas.filter((f) => f.some((c) => c !== ''))
}

// ---------- Escritura ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const letra = (i) => {
  let s = ''
  i++
  while (i > 0) {
    const m = (i - 1) % 26
    s = String.fromCharCode(65 + m) + s
    i = Math.floor((i - 1) / 26)
  }
  return s
}

/** hojas: [{ nombre, filas: [[valores]] }] — la primera fila va en negrita. */
export async function crearExcel(hojas) {
  const zip = new JSZip()
  zip.file('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`)
  zip.file('_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
  zip.file('xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${hojas.map((h, i) => `<sheet name="${esc(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`)
  zip.file('xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
  zip.file('xl/styles.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFACC15"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')

  hojas.forEach((h, i) => {
    const anchos = (h.filas[0] || []).map((_, c) => Math.min(Math.max(...h.filas.map((f) => String(f[c] ?? '').length), 8) + 2, 40))
    const filas = h.filas.map((f, r) =>
      `<row r="${r + 1}">${f.map((v, c) => {
        if (v === undefined || v === null || v === '') return ''
        const ref = `${letra(c)}${r + 1}`
        const s = r === 0 ? ' s="1"' : ''
        return typeof v === 'number' ? `<c r="${ref}"${s}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${s}><is><t>${esc(v)}</t></is></c>`
      }).join('')}</row>`
    ).join('')
    zip.file(`xl/worksheets/sheet${i + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${anchos.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${filas}</sheetData></worksheet>`)
  })

  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
