export type SensitiveDataKind =
  | "PNR"
  | "PASSPORT"
  | "ID_NUMBER"
  | "PAYMENT_CARD"
  | "EMAIL"
  | "PHONE"
  | "NAME";

export interface RedactionResult {
  text: string;
  redacted: boolean;
  kinds: SensitiveDataKind[];
}

interface RedactionRule {
  kind: SensitiveDataKind;
  pattern: RegExp;
  replacement: string | ((substring: string, ...args: string[]) => string);
}

const RULES: RedactionRule[] = [
  // Labeled identity/booking fields run before generic numeric detectors so
  // passport and ID numbers cannot be swallowed by the broader phone rule.
  {
    kind: "PASSPORT",
    pattern: /\b(passport(?:\s+(?:number|no\.?))?|hộ\s*chiếu)\s*[:#-]?\s*([A-Z0-9]{6,12})\b/gi,
    replacement: (_match, label) => `${label} [PASSPORT_REDACTED]`,
  },
  {
    kind: "ID_NUMBER",
    pattern: /\b(cccd|cmnd|citizen\s*id|national\s*id|id\s*(?:number|no\.?))\s*[:#-]?\s*([A-Z0-9-]{6,20})\b/gi,
    replacement: (_match, label) => `${label} [ID_REDACTED]`,
  },
  {
    kind: "PNR",
    pattern: /\b(pnr|booking\s*(?:reference|ref|code)|reservation\s*(?:reference|ref|code))\s*[:#-]?\s*([A-Z0-9]{5,8})\b/gi,
    replacement: (_match, label) => `${label} [PNR_REDACTED]`,
  },
  {
    kind: "NAME",
    pattern: /\b(?:my\s+name\s+is|name|passenger\s+name|tên(?:\s+tôi)?(?:\s+là)?)\s*[:#-]?\s*([A-ZÀ-Ỹ][A-ZÀ-Ỹ'’-]+(?:\s+[A-ZÀ-Ỹ][A-ZÀ-Ỹ'’-]+){1,4})\b/giu,
    replacement: (match) => {
      const separator = match.search(/[:#-]/);
      if (separator >= 0) return `${match.slice(0, separator + 1)} [NAME_REDACTED]`;
      const labelMatch = match.match(/^(my\s+name\s+is|name|passenger\s+name|tên(?:\s+tôi)?(?:\s+là)?)/iu);
      return `${labelMatch?.[0] ?? "name"} [NAME_REDACTED]`;
    },
  },
  {
    kind: "PAYMENT_CARD",
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    replacement: "[PAYMENT_CARD_REDACTED]",
  },
  {
    kind: "EMAIL",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[EMAIL_REDACTED]",
  },
  {
    kind: "PHONE",
    pattern: /(?<!\d)(?:\+?\d[\s().-]?){8,15}(?!\d)/g,
    replacement: "[PHONE_REDACTED]",
  },
];

export function redactSensitiveTravelText(input: string): RedactionResult {
  let text = input;
  const kinds = new Set<SensitiveDataKind>();

  for (const rule of RULES) {
    let matched = false;
    text = text.replace(rule.pattern, (...args) => {
      matched = true;
      if (typeof rule.replacement === "function") {
        return rule.replacement(args[0], ...args.slice(1, -2));
      }
      return rule.replacement;
    });
    if (matched) kinds.add(rule.kind);
  }

  return {
    text,
    redacted: kinds.size > 0,
    kinds: [...kinds],
  };
}
