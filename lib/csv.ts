/**
 * CSV parser za feedove dobavljača.
 *
 * Namjerno pisan ručno umjesto vanjske biblioteke - treba nam tačno ono što
 * feedovi u praksi rade, i ništa više:
 *   - navodnici oko polja, sa udvojenim navodnikom kao escapeom ("" -> ")
 *   - prelomi reda unutar navodnika (opisi proizvoda ih redovno imaju)
 *   - proizvoljan razdvajač (`,` `;` tab `|`)
 *   - BOM na početku fajla (Excel ga uvijek doda)
 *   - CRLF i LF
 */

export type CsvRow = Record<string, string>;

/** Ukloni UTF-8 BOM ako postoji. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Pogodi razdvajač iz prvog reda: pobjeđuje znak koji se pojavljuje
 * najviše puta izvan navodnika.
 */
export function detectDelimiter(text: string): string {
  const sample = stripBom(text).split(/\r?\n/).slice(0, 5).join("\n");
  const candidates = [",", ";", "\t", "|"];

  let best = ",";
  let bestCount = -1;

  for (const candidate of candidates) {
    let count = 0;
    let inQuotes = false;

    for (let i = 0; i < sample.length; i++) {
      const ch = sample[i];
      if (ch === '"') {
        if (inQuotes && sample[i + 1] === '"') i++;
        else inQuotes = !inQuotes;
      } else if (ch === candidate && !inQuotes) {
        count++;
      }
    }

    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }

  return best;
}

/** Razloži cijeli CSV u matricu polja. */
export function parseCsvGrid(text: string, delimiter = ","): string[][] {
  const input = stripBom(text);
  const rows: string[][] = [];

  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = "";
  };

  const endRow = () => {
    endField();
    // Preskoči potpuno prazne redove (zadnji red fajla, prazni redovi u sredini).
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      endField();
    } else if (ch === "\r") {
      if (input[i + 1] === "\n") i++;
      endRow();
    } else if (ch === "\n") {
      endRow();
    } else {
      field += ch;
    }
  }

  // Zadnji red bez završnog preloma.
  if (field !== "" || row.length > 0) endRow();

  return rows;
}

export type ParsedCsv = {
  headers: string[];
  rows: CsvRow[];
  delimiter: string;
};

/**
 * Razloži CSV u objekte, gdje su ključevi nazivi kolona iz prvog reda.
 *
 * `maxRows` štiti od feedova sa stotinama hiljada redova - uvoz se
 * namjerno zaustavlja umjesto da potroši svu memoriju.
 */
export function parseCsv(
  text: string,
  options: { delimiter?: string; maxRows?: number } = {},
): ParsedCsv {
  const delimiter = options.delimiter || detectDelimiter(text);
  const grid = parseCsvGrid(text, delimiter);

  if (grid.length === 0) return { headers: [], rows: [], delimiter };

  const headers = grid[0].map((h) => h.trim());
  const limit = options.maxRows ?? Infinity;
  const rows: CsvRow[] = [];

  for (let i = 1; i < grid.length && rows.length < limit; i++) {
    const values = grid[i];

    // Red sa samo jednim praznim poljem je ostatak preloma - preskoči.
    if (values.length === 1 && values[0].trim() === "") continue;

    const row: CsvRow = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = (values[c] ?? "").trim();
    }
    rows.push(row);
  }

  return { headers, rows, delimiter };
}
