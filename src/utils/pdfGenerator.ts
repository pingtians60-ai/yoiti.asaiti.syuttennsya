import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * 指定したHTML要素（出店許可証のカード一覧など）をキャプチャしてPDFとしてダウンロードする
 */
export async function exportElementToPdf(
  elementId: string,
  fileName: string = '夜市出店許可証一括.pdf'
): Promise<void> {
  const targetElement = document.getElementById(elementId);
  if (!targetElement) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  // クローンまたはスタイル一時適用で背景を白に固定
  const canvas = await html2canvas(targetElement, {
    scale: 2, // 高解像度
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const imgX = (pdfWidth - imgWidth * ratio) / 2;
  const imgY = 10;

  pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
  pdf.save(fileName);
}

/**
 * 複数の許可証（カード）を1ページずつA4でPDF出力する
 */
export async function exportMultipleCardsToPdf(
  cardElementClass: string,
  fileName: string = '出店者許可証_全ブース一括.pdf'
): Promise<void> {
  const elements = document.querySelectorAll(`.${cardElementClass}`);
  if (elements.length === 0) return;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement;
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // A4の中央に配置
    const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 20) / imgHeight);
    const renderWidth = imgWidth * ratio;
    const renderHeight = imgHeight * ratio;
    const imgX = (pdfWidth - renderWidth) / 2;
    const imgY = (pdfHeight - renderHeight) / 2;

    if (i > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, 'PNG', imgX, imgY, renderWidth, renderHeight);
  }

  pdf.save(fileName);
}
