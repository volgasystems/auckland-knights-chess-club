import * as ExcelJS from "exceljs";
import { clubAbbreviation, fideProfileUrl, publicGender } from "@/lib/publicPlayerDisplay";
export async function publicPlayersWorkbook(title: string, players: any[], titles: Record<string, string>) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Auckland Knights Chess Club";
  workbook.title = `${title} — Registered Players`;
  const sheet = workbook.addWorksheet("Registered Players", { views: [{ state: "frozen", ySplit: 3 }] });
  sheet.columns = [8, 9, 36, 10, 16, 14, 14, 10].map(width => ({ width }));
  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = workbook.title;
  sheet.getCell("A1").font = { bold: true, color: { argb: "FFFFFFFF" }, size: 15 };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
  sheet.getRow(1).height = 32;
  sheet.mergeCells("A2:H2");
  sheet.getCell("A2").value = "Paid and confirmed entries only. Blank fields were not supplied.";
  sheet.getCell("A2").font = { italic: true, size: 10, color: { argb: "FF475569" } };
  sheet.addRow(["SNO", "Title", "Name", "Gender", "FIDE ID", "FIDE Rating", "NZCF Rating", "Club"]);
  sheet.getRow(3).eachCell(cell => { cell.font = { bold: true }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }; });
  players.forEach((player, index) => {
    const id = String(player.fide_id || "").trim();
    const profile = fideProfileUrl(id);
    const row = sheet.addRow([index + 1, titles[id] || "", `${player.first_name || ""} ${player.last_name || ""}`.trim(), publicGender(player.gender), profile ? { text: id, hyperlink: profile } : "", player.fide_rating ?? "", player.nzcf_rating ?? "", clubAbbreviation(player.club_name || player.school_name)]);
    row.height = 23;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.alignment = { vertical: "middle" };
      if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    });
    if (profile) row.getCell(5).font = { color: { argb: "FF1E40AF" }, underline: true };
  });
  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: Math.max(3, sheet.rowCount), column: 8 } };
  return workbook.xlsx.writeBuffer();
}
