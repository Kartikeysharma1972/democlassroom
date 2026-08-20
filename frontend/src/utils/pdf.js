// ─────────────────────────────────────────────────────────────────────────
// Universal PDF export.
//
// jsPDF's built-in fonts (helvetica/times/courier) only cover Latin-1, so any
// non-Latin script — Hindi/Devanagari, Bengali, Tamil, Telugu, Urdu (RTL),
// etc. — comes out as garbage boxes when drawn with doc.text(). To support
// EVERY output language we render the content as HTML in the browser (which
// already shapes all these scripts correctly) and snapshot it with
// html2canvas, then place the image into a multi-page A4 PDF.
// ─────────────────────────────────────────────────────────────────────────
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

// A4 width at 96dpi (210mm). Off-screen render containers use this width so the
// captured image maps cleanly onto an A4 page.
export const A4_WIDTH_PX = 794

// Snapshot a live DOM element to a multi-page A4 PDF and trigger a download.
export async function elementToPdf(element, filename) {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    windowWidth: element.scrollWidth,
  })

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const imgW = pageW
  const imgH = (canvas.height * imgW) / canvas.width
  const imgData = canvas.toDataURL('image/png')

  // Place the (possibly very tall) image and shift it up page by page.
  let heightLeft = imgH
  let position = 0
  doc.addImage(imgData, 'PNG', 0, position, imgW, imgH, undefined, 'FAST')
  heightLeft -= pageH
  while (heightLeft > 0) {
    position = heightLeft - imgH
    doc.addPage()
    doc.addImage(imgData, 'PNG', 0, position, imgW, imgH, undefined, 'FAST')
    heightLeft -= pageH
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

// Render an HTML string off-screen and export it as a PDF. The wrapper gets a
// broad font stack so the browser falls back to an installed script font for
// whichever language the content is in.
export async function htmlStringToPdf(html, filename, { width = A4_WIDTH_PX, padding = '36px 40px' } = {}) {
  const holder = document.createElement('div')
  holder.style.cssText =
    `position:fixed;left:-99999px;top:0;width:${width}px;background:#ffffff;` +
    `padding:${padding};box-sizing:border-box;color:#1e293b;` +
    `font-family:"Inter","Noto Sans","Nirmala UI","Noto Sans Devanagari",` +
    `"Noto Sans Tamil","Noto Sans Bengali",system-ui,Arial,sans-serif;` +
    `font-size:15px;line-height:1.6;`
  holder.innerHTML = html
  document.body.appendChild(holder)
  try {
    await waitForImages(holder)
    await new Promise(r => setTimeout(r, 50))
    await elementToPdf(holder, filename)
  } finally {
    holder.remove()
  }
}

function waitForImages(root) {
  const imgs = [...root.querySelectorAll('img')]
  return Promise.all(
    imgs.map(img => (img.complete ? null : new Promise(res => { img.onload = res; img.onerror = res })))
  )
}

// Escape user/AI text before injecting into an HTML string template.
export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
