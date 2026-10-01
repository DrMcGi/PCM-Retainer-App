import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import type { RetainerPlan } from "@/lib/retainer";

export type SignedAgreementPdfData = {
  contractNumber: string;
  agreementVersion: string;
  plan: RetainerPlan;
  companyName: string;
  representativeName: string;
  representativeRole: string;
  representativeEmail: string;
  signedAtLabel: string;
  consentText: string;
  signaturePng: Uint8Array;
  terms: Array<{ title: string; body: string }>;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 52;
const RIGHT = 543;
const BODY_WIDTH = RIGHT - LEFT;
const INK = rgb(0.106, 0.078, 0.039);
const MUTED = rgb(0.38, 0.31, 0.19);
const GOLD = rgb(0.969, 0.847, 0.482);
const GOLD_DARK = rgb(0.42, 0.29, 0.04);
const CYAN = rgb(0.49, 0.976, 1);
const NAVY = rgb(0.027, 0.047, 0.078);
const PAPER = rgb(0.973, 0.949, 0.902);
const RULE = rgb(0.85, 0.81, 0.72);

function pdfText(value: string) {
  return value
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("·", "-")
    .replaceAll("“", '"')
    .replaceAll("”", '"');
}

function wrappedLines(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";

  for (const word of pdfText(text).split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
}

export async function createAgreementPdf(data: SignedAgreementPdfData) {
  const document = await PDFDocument.create();
  document.setTitle(`PCM Retainer Agreement ${data.contractNumber}`);
  document.setAuthor("DrMcGi's SaaS Atelier (Pty) Ltd.");
  document.setSubject("Signed PCM Management Tool retainer agreement");
  const bodyFont = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const displayFont = await document.embedFont(StandardFonts.TimesRoman);
  const logoSvg = await readFile(path.join(process.cwd(), "public", "logo.svg"));
  const logoPng = await sharp(logoSvg, { density: 192 }).resize({ width: 1100 }).png().toBuffer();
  const brandLogo = await document.embedPng(logoPng);
  const pages: PDFPage[] = [];
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  let y = PAGE_HEIGHT - 158;

  function drawPageHeader(currentPage: PDFPage) {
    currentPage.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: PAPER });
    currentPage.drawRectangle({ x: 0, y: PAGE_HEIGHT - 8, width: PAGE_WIDTH, height: 8, color: NAVY });
    currentPage.drawRectangle({ x: 0, y: PAGE_HEIGHT - 10, width: PAGE_WIDTH * 0.68, height: 2, color: GOLD });
    currentPage.drawRectangle({ x: PAGE_WIDTH * 0.68, y: PAGE_HEIGHT - 10, width: PAGE_WIDTH * 0.32, height: 2, color: CYAN });
    const logoFrame = { x: LEFT, y: PAGE_HEIGHT - 132, width: 194, height: 66 };
    currentPage.drawRectangle({
      ...logoFrame,
      color: NAVY,
      borderColor: rgb(0.30, 0.23, 0.10),
      borderWidth: 0.7,
    });
    const logoScale = Math.min((logoFrame.width - 16) / brandLogo.width, (logoFrame.height - 14) / brandLogo.height);
    const logoWidth = brandLogo.width * logoScale;
    const logoHeight = brandLogo.height * logoScale;
    currentPage.drawImage(brandLogo, {
      x: logoFrame.x + (logoFrame.width - logoWidth) / 2,
      y: logoFrame.y + (logoFrame.height - logoHeight) / 2,
      width: logoWidth,
      height: logoHeight,
    });
    currentPage.drawText("Retainer agreement", { x: LEFT + 216, y: PAGE_HEIGHT - 79, size: 21, font: displayFont, color: INK });
    currentPage.drawText("PCM MANAGEMENT TOOL / SUPPORT SERVICES", { x: LEFT + 216, y: PAGE_HEIGHT - 99, size: 7, font: boldFont, color: GOLD_DARK });
    currentPage.drawText(`${data.contractNumber} | ${data.agreementVersion}`, { x: LEFT + 216, y: PAGE_HEIGHT - 117, size: 7, font: bodyFont, color: MUTED });
  }

  function addPage() {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    y = PAGE_HEIGHT - 158;
    drawPageHeader(page);
    return page;
  }

  function ensureRoom(height: number) {
    if (y - height < 65) addPage();
  }

  function drawParagraph(text: string, options?: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; lineGap?: number }) {
    const size = options?.size ?? 9.5;
    const font = options?.font ?? bodyFont;
    const lineGap = options?.lineGap ?? 4;
    const indent = options?.indent ?? 0;
    const lines = wrappedLines(text, font, size, BODY_WIDTH - indent);

    for (const line of lines) {
      ensureRoom(size + lineGap);
      page.drawText(line, { x: LEFT + indent, y, size, font, color: options?.color ?? INK });
      y -= size + lineGap;
    }
    y -= 4;
  }

  drawPageHeader(page);
  drawParagraph(`Agreement ${data.contractNumber}  |  Version ${data.agreementVersion}`, { size: 8, color: MUTED });
  drawParagraph(`${data.plan.name}  |  ZAR ${data.plan.monthlyFee.toLocaleString("en-ZA")} per month`, { size: 15, font: boldFont, color: GOLD_DARK });
  if (data.plan.id === "essential") {
    drawParagraph(`PCM negotiated fee against R${data.plan.listFee.toLocaleString("en-ZA")} list price.`, { size: 9, color: MUTED });
  }
  drawParagraph(`Organisation: ${data.companyName}`);
  y -= 3;

  drawParagraph("Selected package includes", { font: boldFont, size: 10, color: GOLD_DARK });
  for (const item of data.plan.included) drawParagraph(`- ${item}`, { indent: 8, size: 9 });
  drawParagraph(`Allocation: ${data.plan.allocation}`, { font: boldFont, size: 9 });
  drawParagraph("Package exclusions", { font: boldFont, size: 10, color: GOLD_DARK });
  for (const item of data.plan.excluded) drawParagraph(`- ${item}`, { indent: 8, size: 9 });

  for (const term of data.terms) {
    ensureRoom(34);
    y -= 2;
    page.drawText(pdfText(term.title), { x: LEFT, y, size: 10, font: boldFont, color: GOLD_DARK });
    y -= 15;
    drawParagraph(term.body, { size: 9, color: INK, lineGap: 3 });
  }

  ensureRoom(150);
  y -= 5;
  page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 0.7, color: RULE });
  y -= 19;
  page.drawText("Representative acceptance", { x: LEFT, y, size: 11, font: boldFont, color: GOLD_DARK });
  y -= 18;
  drawParagraph(`Name: ${data.representativeName}`);
  drawParagraph(`Role: ${data.representativeRole}`);
  drawParagraph(`Email: ${data.representativeEmail}`);
  drawParagraph(`Signed at: ${data.signedAtLabel} (Africa/Johannesburg)`, { size: 9, color: MUTED });
  drawParagraph(`Acceptance: ${data.consentText}`, { size: 8.5, color: MUTED });

  ensureRoom(100);
  const signatureImage = await document.embedPng(data.signaturePng);
  const signatureScale = Math.min(220 / signatureImage.width, 58 / signatureImage.height);
  page.drawImage(signatureImage, {
    x: LEFT,
    y: y - signatureImage.height * signatureScale - 3,
    width: signatureImage.width * signatureScale,
    height: signatureImage.height * signatureScale,
  });
  y -= signatureImage.height * signatureScale + 8;
  page.drawLine({ start: { x: LEFT, y }, end: { x: LEFT + 230, y }, thickness: 0.7, color: RULE });
  y -= 13;
  page.drawText("Electronic signature", { x: LEFT, y, size: 8, font: bodyFont, color: MUTED });

  pages.forEach((currentPage, index) => {
    currentPage.drawLine({ start: { x: LEFT, y: 42 }, end: { x: RIGHT, y: 42 }, thickness: 0.6, color: RULE });
    currentPage.drawText("Signed electronic record - typed email is not independently identity-verified.", {
      x: LEFT,
      y: 28,
      size: 7,
      font: bodyFont,
      color: MUTED,
    });
    currentPage.drawText(`${index + 1} / ${pages.length}`, { x: RIGHT - 32, y: 28, size: 7, font: bodyFont, color: MUTED });
  });

  return document.save();
}