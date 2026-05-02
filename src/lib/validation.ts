// RFC-5322 inspired but pragmatic. Rejects obvious junk while staying readable.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  if (!value || value.length > 254) return false;
  return EMAIL_RE.test(value.trim());
}

export type PasswordCheck = {
  id: "length" | "letter" | "digit" | "special";
  label: string;
  ok: boolean;
};

export function checkPassword(pw: string): PasswordCheck[] {
  return [
    { id: "length", label: "At least 8 characters", ok: pw.length >= 8 },
    { id: "letter", label: "Contains a letter (a–z)", ok: /[a-zA-Z]/.test(pw) },
    { id: "digit", label: "Contains a digit (0–9)", ok: /[0-9]/.test(pw) },
    {
      id: "special",
      label: "Contains a special character (!@#…)",
      ok: /[^a-zA-Z0-9]/.test(pw),
    },
  ];
}

export function isValidPassword(pw: string): boolean {
  return checkPassword(pw).every((c) => c.ok);
}

export function passwordError(pw: string): string | null {
  const failed = checkPassword(pw).find((c) => !c.ok);
  if (!failed) return null;
  switch (failed.id) {
    case "length":
      return "Password must be at least 8 characters.";
    case "letter":
      return "Password must contain at least one letter.";
    case "digit":
      return "Password must contain at least one digit.";
    case "special":
      return "Password must contain at least one special character.";
  }
}
