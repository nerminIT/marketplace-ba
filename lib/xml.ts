/**
 * XML parser za feedove dobavljača.
 *
 * Kao i `csv.ts`, pisan ručno namjerno - ne treba nam opći DOM/XPath
 * parser, nego tačno ono što feedovi u praksi rade: ravna struktura
 * `<Korijen><Stavka><Polje>tekst</Polje>...</Stavka></Korijen>`, bez
 * atributa koji nose podatke i bez ugniježđenih ponavljajućih polja.
 *
 * Podržano:
 *   - `<?xml ...?>` deklaracija i komentari `<!-- ... -->` (preskaču se)
 *   - standardni entiteti (&amp; &lt; &gt; &quot; &apos;) i brojčani (&#38; &#x26;)
 *   - CDATA blokovi
 *   - stavka se prepoznaje automatski: element koji se najviše puta ponavlja
 *     kao dijete istog roditelja
 *
 * Nije podržano (namjerno - dovoljno za tipičan flat proizvod-feed):
 *   - atributi kao izvor podataka
 *   - ugniježđena polja (npr. <Specs><Param>...) - uzima se samo tekst
 *   - polje ponovljeno više puta unutar iste stavke - zadržava se zadnje
 */

export type XmlRow = Record<string, string>;

export type ParsedXml = {
  headers: string[];
  rows: XmlRow[];
  /** Naziv taga koji predstavlja jednu stavku, npr. "Product". */
  itemTag: string;
};

type XmlNode = {
  tag: string;
  children: XmlNode[];
  text: string;
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code: string) => {
    if (code[0] === "#") {
      const isHex = code[1] === "x" || code[1] === "X";
      const num = parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(num) ? String.fromCodePoint(num) : match;
    }
    return ENTITIES[code] ?? match;
  });
}

/** Skine deklaraciju, komentare i DOCTYPE prije parsiranja. */
function stripPreamble(text: string): string {
  return text
    .replace(/^﻿/, "")
    .replace(/<\?xml[\s\S]*?\?>/i, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/i, "")
    .trim();
}

/**
 * Razloži XML tekst u stablo elemenata. Ne baca grešku na blago nevaljan
 * XML (npr. neescapovan `&` u tekstu) - takav znak se jednostavno zadrži.
 */
function parseTree(text: string): XmlNode | null {
  const input = stripPreamble(text);
  const root: XmlNode = { tag: "", children: [], text: "" };
  const stack: XmlNode[] = [root];

  // Tag otvaranja/zatvaranja/samozatvarajući, ili CDATA blok.
  const tagRe = /<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([a-zA-Z_][\w.:-]*)((?:\s+[^<>]*?)?)(\/?)>/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const appendText = (raw: string) => {
    if (!raw) return;
    const top = stack[stack.length - 1];
    top.text += raw;
  };

  while ((match = tagRe.exec(input))) {
    appendText(decodeEntities(input.slice(lastIndex, match.index)));
    lastIndex = tagRe.lastIndex;

    const [, cdata, closing, name, , selfClose] = match;

    if (cdata !== undefined) {
      appendText(cdata);
      continue;
    }

    if (closing) {
      // Zatvara element - ako se ne poklapa sa vrhom steka, ipak skini
      // vrh (blago nevaljan XML ne smije zaustaviti cijeli uvoz).
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === name) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const node: XmlNode = { tag: name, children: [], text: "" };
    stack[stack.length - 1].children.push(node);
    if (!selfClose) stack.push(node);
  }

  appendText(decodeEntities(input.slice(lastIndex)));

  return root.children[0] ?? null;
}

/** Nađe element koji se najčešće ponavlja kao dijete istog roditelja. */
function findItemTag(root: XmlNode): { parent: XmlNode; tag: string } | null {
  let best: { parent: XmlNode; tag: string; count: number } | null = null;

  const visit = (node: XmlNode) => {
    const counts = new Map<string, number>();
    for (const child of node.children) {
      counts.set(child.tag, (counts.get(child.tag) ?? 0) + 1);
    }
    for (const [tag, count] of counts) {
      if (count > 1 && (!best || count > best.count)) {
        best = { parent: node, tag, count };
      }
    }
    for (const child of node.children) visit(child);
  };

  visit(root);
  return best;
}

function nodeToRow(node: XmlNode): XmlRow {
  const row: XmlRow = {};
  for (const child of node.children) {
    row[child.tag] = child.text.trim();
  }
  return row;
}

/**
 * Razloži XML feed u redove, u istom obliku u kojem `parseCsv` vraća CSV -
 * ostatak uvoza (mapiranje, cijene, upis) ne zna niti mari odakle su stigli.
 */
export function parseXml(
  text: string,
  options: { maxRows?: number } = {},
): ParsedXml {
  const root = parseTree(text);
  if (!root) return { headers: [], rows: [], itemTag: "" };

  const found = findItemTag(root);
  if (!found) return { headers: [], rows: [], itemTag: "" };

  const { parent, tag } = found;
  const limit = options.maxRows ?? Infinity;
  const rows: XmlRow[] = [];
  const headerSet = new Set<string>();

  for (const child of parent.children) {
    if (child.tag !== tag) continue;
    if (rows.length >= limit) break;

    const row = nodeToRow(child);
    for (const key of Object.keys(row)) headerSet.add(key);
    rows.push(row);
  }

  return { headers: [...headerSet], rows, itemTag: tag };
}
