import { describe, expect, test } from "bun:test";
import { redactSensitiveTravelText } from "./privacy-redaction";

describe("privacy redaction", () => {
  test("redacts PNR, passport, card, email and phone before hosted-model use", () => {
    const result = redactSensitiveTravelText(
      "My name is Nguyen Van An, PNR Q7K9LM, passport C12345678, email an@example.com, phone +84 912 345 678, card 4111 1111 1111 1111. Need 20kg and arrive before 18:00."
    );

    expect(result.redacted).toBe(true);
    expect(result.kinds).toContain("PNR");
    expect(result.kinds).toContain("PASSPORT");
    expect(result.kinds).toContain("PAYMENT_CARD");
    expect(result.kinds).toContain("EMAIL");
    expect(result.kinds).toContain("PHONE");
    expect(result.kinds).toContain("NAME");
    expect(result.text).not.toContain("Q7K9LM");
    expect(result.text).not.toContain("C12345678");
    expect(result.text).not.toContain("4111");
    expect(result.text).toContain("20kg");
    expect(result.text).toContain("18:00");
  });

  test("keeps ordinary recovery constraints unchanged", () => {
    const brief =
      "Reach Singapore before 18:00 with 20kg baggage and spend at most $50 extra.";
    const result = redactSensitiveTravelText(brief);

    expect(result.redacted).toBe(false);
    expect(result.kinds).toEqual([]);
    expect(result.text).toBe(brief);
  });

  test("redacts Vietnamese labeled identity fields", () => {
    const result = redactSensitiveTravelText(
      "Tên tôi là Nguyễn Văn An, CCCD 079203001234, PNR AB12CD. Tôi cần đến trước 18:00."
    );

    expect(result.text).toContain("[NAME_REDACTED]");
    expect(result.text).toContain("[ID_REDACTED]");
    expect(result.text).toContain("[PNR_REDACTED]");
    expect(result.text).toContain("18:00");
  });
});
