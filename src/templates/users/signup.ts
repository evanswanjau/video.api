// src/templates/registerUserTemplate.ts
export const signUpTemplate = (name: string, activationLink: string) => `
  <h1>Welcome to Our Service, ${name}!</h1>
  <p>Thank you for registering with us. We are excited to have you on board!</p>
  <p>Please activate your account by clicking the link below:</p>
  <p><a href="${activationLink}">Activate Your Account</a></p>
  <p>If you have any questions, feel free to reach out to our support team.</p>
  <p>Best regards,<br>Your Service Team</p>
`;
