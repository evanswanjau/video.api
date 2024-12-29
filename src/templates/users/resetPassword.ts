// src/templates/resetPasswordTemplate.ts
export const resetPasswordTemplate = (resetLink: string) => `
  <h1>Password Reset Request</h1>
  <p>To reset your password, click the link below:</p>
  <a href="${resetLink}">Reset Password</a>
  <p>If you did not request this, please ignore this email.</p>
`;

