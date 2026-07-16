/**
 * Download rendered report HTML as a .doc Word opens natively.
 *
 * Word reads HTML when it carries the msword MIME type and the Office
 * namespaces below, so the LPJ arrives with its headings and budget tables
 * intact and still fully editable -- no document-generation library, which
 * for this project would be a heavy dependency to maintain for one button.
 *
 * Photos are intentionally left out: their <img> sources are server paths,
 * so they would render as broken boxes once the file is copied to another
 * machine. Photo evidence goes through the print/PDF path instead, which
 * resolves them while still on the app.
 */
export function downloadAsDoc(params: {
  html: string;
  title: string;
  eventName: string;
  fileName: string;
  /** Only LPJ gets the institutional letterhead + signature block --
   * everything below is real committee data (or an honest blank line for
   * hand-signing), never invented. */
  isLpj: boolean;
  ketuaPelaksana: string | null;
}): void {
  const { html, title, eventName, fileName, isLpj, ketuaPelaksana } = params;

  const letterhead = isLpj
    ? `<div class="letterhead">
  <p style="font-weight:bold;text-transform:uppercase;margin:0;">Himpunan Mahasiswa Teknik Informatika (HMIF)</p>
  <p style="font-weight:600;text-transform:uppercase;margin:0;">Universitas Kebangsaan Republik Indonesia (UKRI)</p>
  <p style="font-style:italic;font-size:9pt;margin:2pt 0 0;">Sekretariat: Jl. Terusan Halimun No. 37, Langa, Bandung. Telp: (022) 731 234</p>
</div>`
    : "";

  const signature = isLpj
    ? `<table class="signature-block" style="border:none;margin-top:36pt;">
  <tr>
    <td style="border:none;width:50%;text-align:center;">
      <p style="margin:0;">Ketua Pelaksana,</p>
      <p style="margin:0;font-weight:bold;">${eventName}</p>
      <p style="margin:40pt 0 0;font-weight:bold;text-decoration:underline;">${ketuaPelaksana ?? "&nbsp;"}</p>
      <p style="margin:0;font-size:9pt;">Ketua Pelaksana</p>
    </td>
    <td style="border:none;width:50%;text-align:center;">
      <p style="margin:0;">Mengetahui,</p>
      <p style="margin:0;font-weight:bold;">Ketua Umum HMIF UKRI</p>
      <p style="margin:40pt 0 0;font-weight:bold;text-decoration:underline;">&nbsp;</p>
      <p style="margin:0;font-size:9pt;">Ketua Himpunan</p>
    </td>
  </tr>
</table>`
    : "";

  const doc = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${title} — ${eventName}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; color: #000; }
  h1 { font-size: 16pt; }
  h2 { font-size: 13pt; margin-top: 18pt; }
  h3 { font-size: 12pt; }
  p { text-align: justify; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; }
  th, td { border: 1px solid #333; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f1f1f1; font-weight: bold; }
  .letterhead { text-align: center; border-bottom: 3px double #000; padding-bottom: 8pt; margin-bottom: 10pt; }
  .doc-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8pt; margin-bottom: 16pt; }
</style>
</head>
<body>
${letterhead}
<div class="doc-header">
  <p style="font-weight:bold;text-transform:uppercase;margin:0;">${title}</p>
  <p style="margin:0;">${eventName}</p>
</div>
${html}
${signature}
</body>
</html>`;

  // The BOM keeps Word from mis-detecting the encoding and mangling "Rp".
  const blob = new Blob(["﻿", doc], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
