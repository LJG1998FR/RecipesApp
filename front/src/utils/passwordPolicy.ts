export const PASSWORD_MIN_LENGTH = 16;

export interface PasswordCheck {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  digit: boolean;
}

export function checkPassword(password: string): PasswordCheck {
  return {
    length:    password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit:     /[0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const c = checkPassword(password);
  return c.length && c.uppercase && c.lowercase && c.digit;
}