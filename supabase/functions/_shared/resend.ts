export interface SendEmailParams {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({
  to,
  from = "Sua Empresa <noreply@talentred.com.br>",
  subject,
  html,
  text,
}: SendEmailParams) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${errorText}`);
  }

  return response.json();
}
