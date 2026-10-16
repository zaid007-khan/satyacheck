import PDFDocument from "pdfkit";
import type { ScanFlag } from "@/db/schema";

export type PdfScanData = {
  id: string;
  type: string;
  target: string;
  trustScore: number;
  verdict: string;
  confidence: number;
  flags: ScanFlag[];
  signals: Record<string, number | string | boolean>;
  durationMs: number;
  createdAt: Date;
  userName: string;
  userEmail: string;
};

const NAVY = "#0a1128";
const BLUE = "#2563eb";
const VERDICT_COLORS: Record<string, string> = {
  authentic: "#15803d",
  uncertain: "#b45309",
  manipulated: "#b91c1c",
};

export function buildScanReportPdf(scan: PdfScanData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 54, info: { Title: "SatyaCheck Verification Report", Author: "SatyaCheck Trust Platform" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ---- Watermark (drawn first, behind content) ----
    doc.save();
    doc.opacity(0.055);
    doc.fontSize(64).font("Helvetica-Bold").fillColor(NAVY);
    doc.rotate(-28, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.text("VERIFIED  BY  SATYACHECK", 40, doc.page.height / 2 - 40, { width: doc.page.width - 80, align: "center" });
    doc.restore();

    // ---- Header band ----
    doc.save().rect(0, 0, doc.page.width, 92).fill(NAVY).restore();
    doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold").text("SatyaCheck", 54, 30);
    doc.fillColor("#7dd3fc").fontSize(10).font("Helvetica").text("Digital Trust & Deepfake Detection Report — भारत सरकार नागरिक सुरक्षा पहल", 54, 58);
    doc.fillColor("#94a3b8").fontSize(9).text(new Date(scan.createdAt).toUTCString(), 54, 74);

    let y = 118;

    // ---- Scan summary card ----
    doc.save().roundedRect(54, y, pageW, 92, 8).fill("#f1f5f9").restore();
    doc.fillColor(NAVY).fontSize(11).font("Helvetica-Bold").text("SCAN SUMMARY", 68, y + 12);
    doc.fillColor("#334155").fontSize(9.5).font("Helvetica");
    doc.text(`Scan ID:  ${scan.id}`, 68, y + 30);
    doc.text(`Type:     ${scan.type.toUpperCase()} analysis`, 68, y + 44);
    doc.text(`Target:   ${scan.target.slice(0, 90) || "uploaded media"}`, 68, y + 58);
    doc.text(`Analyst:  ${scan.userName} <${scan.userEmail}>`, 68, y + 72);

    // Trust gauge bar
    const gaugeX = 54 + pageW - 190, gaugeY = y + 22, gaugeW = 160, gaugeH = 16;
    doc.save().roundedRect(gaugeX, gaugeY, gaugeW, gaugeH, 6).fill("#e2e8f0").restore();
    const fillW = Math.max(8, (scan.trustScore / 100) * gaugeW);
    const vc = VERDICT_COLORS[scan.verdict] || BLUE;
    doc.save().roundedRect(gaugeX, gaugeY, fillW, gaugeH, 6).fill(vc).restore();
    doc.fillColor(NAVY).fontSize(20).font("Helvetica-Bold").text(`${scan.trustScore}`, gaugeX, gaugeY + 24, { width: gaugeW, align: "center" });
    doc.fillColor("#64748b").fontSize(8).font("Helvetica").text("TRUST SCORE / 100", gaugeX, gaugeY + 48, { width: gaugeW, align: "center" });

    y += 116;

    // ---- Verdict ----
    doc.save().roundedRect(54, y, pageW, 54, 8).fill(vc).restore();
    doc.fillColor("#ffffff").fontSize(15).font("Helvetica-Bold").text(`VERDICT:  ${scan.verdict.toUpperCase()}`, 68, y + 12);
    doc.fontSize(9.5).font("Helvetica").text(`Model confidence ${scan.confidence}%  •  Analysis completed in ${scan.durationMs} ms`, 68, y + 33);
    y += 78;

    // ---- Detection flags ----
    doc.fillColor(NAVY).fontSize(11).font("Helvetica-Bold").text("DETECTION FLAGS", 54, y);
    y += 18;
    for (const f of scan.flags.slice(0, 10)) {
      const chip = f.severity.toUpperCase();
      const chipColor = f.severity === "high" ? "#b91c1c" : f.severity === "medium" ? "#b45309" : f.severity === "low" ? "#0369a1" : "#047857";
      doc.save().roundedRect(54, y, 64, 14, 4).fill(chipColor).restore();
      doc.fillColor("#ffffff").fontSize(7.5).font("Helvetica-Bold").text(chip, 54, y + 3.5, { width: 64, align: "center" });
      doc.fillColor(NAVY).fontSize(9.5).font("Helvetica-Bold").text(f.label, 126, y, { width: pageW - 72 });
      doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(f.detail, 126, y + 12, { width: pageW - 72 });
      y += 34;
      if (y > 760) { doc.addPage(); y = 60; }
    }

    // ---- Signals table ----
    y += 8;
    if (y > 700) { doc.addPage(); y = 60; }
    doc.fillColor(NAVY).fontSize(11).font("Helvetica-Bold").text("FORENSIC SIGNALS", 54, y);
    y += 16;
    const entries = Object.entries(scan.signals).filter(([, v]) => v !== "" && v !== null).slice(0, 14);
    entries.forEach(([k, v], i) => {
      if (i % 2 === 0) {
        doc.save().rect(54, y - 2, pageW, 16).fill(i % 4 === 0 ? "#f8fafc" : "#eef2f7").restore();
      }
      doc.fillColor("#475569").fontSize(8.5).font("Helvetica").text(k, 62, y);
      doc.fillColor(NAVY).font("Helvetica-Bold").text(String(v), 54 + pageW - 180, y, { width: 172, align: "right" });
      y += 16;
      if (y > 780) { doc.addPage(); y = 60; }
    });

    // ---- Footer / disclaimer ----
    y = doc.page.height - 96;
    doc.moveTo(54, y).lineTo(54 + pageW, y).stroke("#cbd5e1");
    doc.fillColor("#64748b").fontSize(7.5).font("Helvetica").text(
      "Automated forensic analysis by SatyaCheck (image spectral analysis, neural deepfake classifiers, voice-clone DSP, misinformation heuristics). " +
      "Results are probabilistic indicators, not legal evidence. Report suspected synthetic media to https://cybercrime.gov.in (Govt. of India).",
      54, y + 8, { width: pageW, align: "justify" }
    );
    doc.fillColor(BLUE).font("Helvetica-Bold").text("Generated by SatyaCheck • satyacheck • Digital Trust for India", 54, y + 40, { width: pageW, align: "center" });

    doc.end();
  });
}
