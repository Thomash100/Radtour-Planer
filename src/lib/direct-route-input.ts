export type DirectRouteInputFields = {
  start?: unknown;
  end?: unknown;
};

export type DirectRouteInputResult =
  | {
      ok: true;
      start: string;
      end: string;
      detectedExpression?: string;
    }
  | {
      ok: false;
      error: string;
    };

const separatorPatterns: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\s+(?:nach|bis)\s+/i, label: "Worttrenner" },
  { pattern: /\s*(?:→|->|=>)\s*/u, label: "Pfeil" },
  { pattern: /\s*[-–—]\s*/u, label: "Bindestrich" }
];

export function normalizeRouteInputText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function parseRouteExpression(value: unknown): { start: string; end: string; separator: string } | null {
  const input = normalizeRouteInputText(value);
  if (!input) {
    return null;
  }

  for (const separator of separatorPatterns) {
    const parts = input
      .split(separator.pattern)
      .map((part) => normalizeRouteInputText(part))
      .filter(Boolean);

    if (parts.length === 2 && parts[0].length >= 2 && parts[1].length >= 2) {
      return { start: parts[0], end: parts[1], separator: separator.label };
    }
  }

  return null;
}

export function normalizeDirectRouteInput(fields: DirectRouteInputFields): DirectRouteInputResult {
  const start = normalizeRouteInputText(fields.start);
  const end = normalizeRouteInputText(fields.end);

  if (!start && !end) {
    return { ok: false, error: "Bitte Start und Ziel eingeben." };
  }

  if (start && !end) {
    const parsed = parseRouteExpression(start);
    if (parsed) {
      return {
        ok: true,
        start: parsed.start,
        end: parsed.end,
        detectedExpression: `${parsed.start} - ${parsed.end}`
      };
    }
    return { ok: false, error: "Bitte Zielort ergänzen oder die Strecke mit Bindestrich, Pfeil, \"nach\" oder \"bis\" trennen." };
  }

  if (!start && end) {
    const parsed = parseRouteExpression(end);
    if (parsed) {
      return {
        ok: true,
        start: parsed.start,
        end: parsed.end,
        detectedExpression: `${parsed.start} - ${parsed.end}`
      };
    }
    return { ok: false, error: "Bitte Startort ergänzen oder die Strecke mit Bindestrich, Pfeil, \"nach\" oder \"bis\" trennen." };
  }

  return {
    ok: true,
    start,
    end
  };
}

export function normalizeRouteCalculationPayload<T extends Record<string, unknown>>(payload: T) {
  const routeInput = normalizeDirectRouteInput({ start: payload.start, end: payload.end });
  if (!routeInput.ok) {
    throw new Error(routeInput.error);
  }

  return {
    ...payload,
    start: routeInput.start,
    end: routeInput.end
  };
}
