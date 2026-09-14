import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

export async function exportNodeToPdf(node, filename = 'bao-cao-thi-dua.pdf') {
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    scrollY: -window.scrollY,
    scrollX: 0,
    windowWidth: document.documentElement.offsetWidth,
    logging: false,
  })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 10
  const imgW = pageW - margin * 2
  const imgH = (canvas.height * imgW) / canvas.width

  let heightLeft = imgH
  let position = margin
  pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH)
  heightLeft -= pageH - margin * 2

  while (heightLeft > 0) {
    position -= pageH - margin * 2
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH)
    heightLeft -= pageH - margin * 2
  }
  pdf.save(filename)
}