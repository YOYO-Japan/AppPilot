
// Declare JSZip global from CDN
declare const JSZip: any;

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the Data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read text file'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const createEpubBlob = async (htmlContent: string, title: string = "Converted E-Book"): Promise<Blob> => {
  if (typeof JSZip === 'undefined') {
    throw new Error("JSZip library not loaded. Check internet connection.");
  }

  const zip = new JSZip();
  const uuid = 'urn:uuid:' + crypto.randomUUID();

  // 1. mimetype (Must be first and uncompressed)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
   <rootfiles>
      <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
   </rootfiles>
</container>`;
  zip.folder("META-INF").file("container.xml", containerXml);

  // 3. OEBPS Folder (Content)
  const oebps = zip.folder("OEBPS");

  // CSS
  const css = `
    body { font-family: serif; line-height: 1.5; margin: 5%; }
    p { margin-bottom: 1em; text-indent: 0; }
    h1, h2, h3 { font-family: sans-serif; margin-top: 1.5em; page-break-after: avoid; }
    img { max-width: 100%; height: auto; }
  `;
  oebps.file("style.css", css);

  // Content HTML (XHTML compliant)
  const xhtmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${title}</h1>
  ${htmlContent}
</body>
</html>`;
  oebps.file("content.xhtml", xhtmlContent);

  // content.opf (Manifest & Spine)
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
   <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
      <dc:title>${title}</dc:title>
      <dc:language>en</dc:language>
      <dc:identifier id="BookID" opf:scheme="UUID">${uuid}</dc:identifier>
      <dc:creator>Offline Converter</dc:creator>
   </metadata>
   <manifest>
      <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
      <item id="style" href="style.css" media-type="text/css"/>
      <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
   </manifest>
   <spine toc="ncx">
      <itemref idref="content"/>
   </spine>
</package>`;
  oebps.file("content.opf", contentOpf);

  // toc.ncx (Table of Contents)
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
   <head>
      <meta name="dtb:uid" content="${uuid}"/>
      <meta name="dtb:depth" content="1"/>
      <meta name="dtb:totalPageCount" content="0"/>
      <meta name="dtb:maxPageNumber" content="0"/>
   </head>
   <docTitle>
      <text>${title}</text>
   </docTitle>
   <navMap>
      <navPoint id="navPoint-1" playOrder="1">
         <navLabel>
            <text>Start</text>
         </navLabel>
         <content src="content.xhtml"/>
      </navPoint>
   </navMap>
</ncx>`;
  oebps.file("toc.ncx", tocNcx);

  // Generate Blob
  return await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
};

// --- MOBI/AZW3 Binary Generator Helpers ---

const stringToUint8Array = (str: string) => new TextEncoder().encode(str);

const writeString = (view: DataView, offset: number, str: string, length: number) => {
  const bytes = stringToUint8Array(str);
  for (let i = 0; i < length; i++) {
    view.setUint8(offset + i, i < bytes.length ? bytes[i] : 0);
  }
};

export const createMobiBlob = async (htmlContent: string, title: string = "Converted E-Book"): Promise<Blob> => {
  // Construct a minimal "Mobi" (PalmDOC) binary. 
  // This is a simplified version compatible with Kindle (often detected as azw3 or mobi).
  
  // Wrap content in simple HTML for Kindle
  const fullContent = `<html><head><title>${title}</title></head><body><h1>${title}</h1>${htmlContent}</body></html>`;
  const contentBytes = stringToUint8Array(fullContent);
  const contentLen = contentBytes.length;

  // Constants
  const NAME_LEN = 32;
  const PDB_HEADER_LEN = 78;
  const RECORD_INFO_LEN = 8;
  const PALMDOC_HEADER_LEN = 16;
  const MOBI_HEADER_LEN = 232; 
  const EXTH_HEADER_LEN = 0; // Simplified for this example
  const RECORD_0_LEN = PALMDOC_HEADER_LEN + MOBI_HEADER_LEN + EXTH_HEADER_LEN;

  // We will have 2 records: Record 0 (Headers) and Record 1 (Text Content)
  // Real MOBI often splits text into 4096 byte chunks, but simple ones accept larger records.
  const numRecords = 2;
  
  const totalLen = PDB_HEADER_LEN + (numRecords * RECORD_INFO_LEN) + RECORD_0_LEN + contentLen;
  const buffer = new ArrayBuffer(totalLen);
  const view = new DataView(buffer);
  
  // 1. PDB Header
  writeString(view, 0, title.substring(0, 31), NAME_LEN);
  view.setUint16(32, 0, false); // Attributes
  view.setUint16(34, 0, false); // Version
  
  const now = Math.floor(Date.now() / 1000) + 2082844800; // Palm Epoch (1904) to Unix Epoch fix roughly
  view.setUint32(36, now, false); // Creation Date
  view.setUint32(40, now, false); // Mod Date
  view.setUint32(44, 0, false); // Backup Date
  view.setUint32(48, 0, false); // Mod Num
  view.setUint32(52, 0, false); // App Info ID
  view.setUint32(56, 0, false); // Sort Info ID
  writeString(view, 60, "BOOK", 4); // Type
  writeString(view, 64, "MOBI", 4); // Creator
  view.setUint32(68, 1, false); // Unique ID Seed
  view.setUint32(72, 0, false); // Next Record List ID
  view.setUint16(76, numRecords, false); // Num Records

  // 2. Record List (Offsets)
  let currentOffset = PDB_HEADER_LEN + (numRecords * RECORD_INFO_LEN);
  
  // Record 0 Offset (Headers)
  view.setUint32(78, currentOffset, false);
  view.setUint32(82, 0, false); // Attributes (0) + ID (0)
  
  currentOffset += RECORD_0_LEN;

  // Record 1 Offset (Content)
  view.setUint32(86, currentOffset, false);
  view.setUint32(90, 2, false); // Attributes (0) + ID (1) shifted

  // 3. Record 0: Headers
  const rec0Start = PDB_HEADER_LEN + (numRecords * RECORD_INFO_LEN);
  
  // PalmDOC Header
  view.setUint16(rec0Start, 1, false); // Compression (1 = No Compression)
  view.setUint16(rec0Start + 2, 0, false); // Unused
  view.setUint32(rec0Start + 4, contentLen, false); // Text Length
  view.setUint16(rec0Start + 8, 1, false); // Record Count
  view.setUint16(rec0Start + 10, 4096, false); // Record Size
  view.setUint32(rec0Start + 12, 0, false); // Current Position

  // MOBI Header
  const mobiStart = rec0Start + PALMDOC_HEADER_LEN;
  writeString(view, mobiStart, "MOBI", 4); // Identifier
  view.setUint32(mobiStart + 4, MOBI_HEADER_LEN, false); // Header Length
  view.setUint32(mobiStart + 8, 2, false); // Mobi Type (2 = Book)
  view.setUint32(mobiStart + 12, 65001, false); // Text Encoding (UTF-8)
  view.setUint32(mobiStart + 16, 123456789, false); // ID
  view.setUint32(mobiStart + 20, 6, false); // File Version
  // ... rest of MOBI header defaults to 0 usually works for basic readers

  view.setUint32(mobiStart + 80, 0, false); // First Non-Book Index
  view.setUint32(mobiStart + 84, 0, false); // Full Name Offset
  view.setUint32(mobiStart + 88, 0, false); // Full Name Length
  
  view.setUint16(mobiStart + 128, 0, false); // First EXTH Index (0 = none)
  
  // 4. Record 1: Content
  const contentStart = rec0Start + RECORD_0_LEN;
  const contentArray = new Uint8Array(buffer, contentStart, contentLen);
  contentArray.set(contentBytes);

  return new Blob([buffer], { type: "application/x-mobipocket-ebook" });
};
