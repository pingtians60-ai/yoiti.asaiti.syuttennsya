import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { EventEntry, NightMarketEvent } from '../types';

export interface FileItemToMerge {
  name: string;
  vendorName: string;
  boothNumber: string;
  bytes: Uint8Array;
}

/**
 * 複数のPDFファイルを単一のPDFに結合する
 */
export async function mergePdfDocuments(
  files: FileItemToMerge[],
  eventInfo?: NightMarketEvent,
  includeCoverPage: boolean = true
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  // 1. 表紙ページ（目次・消防提出用まとめ表紙）を作成
  if (includeCoverPage && eventInfo) {
    const coverPage = mergedPdf.addPage([595.28, 841.89]); // A4サイズ
    const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await mergedPdf.embedFont(StandardFonts.Helvetica);

    const { width, height } = coverPage.getSize();

    // 枠線
    coverPage.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 2,
    });

    // 表紙タイトル
    coverPage.drawText('FIRE SAFETY & BOOTH DOCUMENTS', {
      x: 50,
      y: height - 100,
      size: 20,
      font,
      color: rgb(0.8, 0.1, 0.1),
    });

    coverPage.drawText(`Event: ${eventInfo.name}`, {
      x: 50,
      y: height - 140,
      size: 13,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    coverPage.drawText(`Date: ${eventInfo.date}   |   Venue: ${eventInfo.venue}`, {
      x: 50,
      y: height - 165,
      size: 11,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    coverPage.drawText(`Fire Department: ${eventInfo.fireDepartmentName}`, {
      x: 50,
      y: height - 190,
      size: 11,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    // 添付ファイル目次
    coverPage.drawText('Attached Documents List / Index:', {
      x: 50,
      y: height - 240,
      size: 13,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    let yOffset = height - 270;
    files.forEach((file, index) => {
      if (yOffset > 70) {
        coverPage.drawText(`${index + 1}. [${file.boothNumber}] ${file.vendorName} - ${file.name}`, {
          x: 60,
          y: yOffset,
          size: 10,
          font: regularFont,
          color: rgb(0.2, 0.2, 0.2),
        });
        yOffset -= 22;
      }
    });

    coverPage.drawText(`Generated on: ${new Date().toLocaleString('ja-JP')}  |  Total Files: ${files.length}`, {
      x: 50,
      y: 50,
      size: 9,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // 2. 各PDFを取り込んで結合
  for (const fileItem of files) {
    try {
      const srcDoc = await PDFDocument.load(fileItem.bytes, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
      
      for (const page of copiedPages) {
        // 各ページの右上に識別タグを付与
        mergedPdf.addPage(page);
      }
    } catch (err) {
      console.warn(`Failed to merge file: ${fileItem.name}`, err);
    }
  }

  return await mergedPdf.save();
}

/**
 * 模擬消防書類のサンプルPDF（デモ用）を動的に生成するヘルパー
 */
export async function createSampleDocPdf(
  vendorName: string,
  boothNumber: string,
  docType: string,
  details: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  // ヘッダー背景
  page.drawRectangle({
    x: 40,
    y: height - 90,
    width: width - 80,
    height: 60,
    color: rgb(0.95, 0.95, 0.98),
    borderColor: rgb(0.7, 0.2, 0.2),
    borderWidth: 1,
  });

  page.drawText(`FIRE SAFETY ATTACHMENT: ${docType.toUpperCase()}`, {
    x: 55,
    y: height - 60,
    size: 14,
    font,
    color: rgb(0.75, 0.1, 0.1),
  });

  page.drawText(`Booth: ${boothNumber}   |   Vendor: ${vendorName}`, {
    x: 55,
    y: height - 80,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  // 本文枠
  page.drawRectangle({
    x: 40,
    y: 60,
    width: width - 80,
    height: height - 170,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1,
  });

  page.drawText('Document Details & Verification:', {
    x: 60,
    y: height - 130,
    size: 12,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`Type: ${docType}`, {
    x: 60,
    y: height - 160,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(`Notes: ${details}`, {
    x: 60,
    y: height - 185,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  // 消防点検スタンプ風の枠
  page.drawRectangle({
    x: width - 200,
    y: height - 250,
    width: 140,
    height: 70,
    borderColor: rgb(0.8, 0.2, 0.2),
    borderWidth: 2,
  });

  page.drawText('FIRE SAFETY OK', {
    x: width - 185,
    y: height - 210,
    size: 12,
    font,
    color: rgb(0.8, 0.2, 0.2),
  });

  page.drawText(`Inspected: 2026-09`, {
    x: width - 185,
    y: height - 235,
    size: 10,
    font: regularFont,
    color: rgb(0.8, 0.2, 0.2),
  });

  return await doc.save();
}
