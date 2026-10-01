import { Resend } from "resend";

type AgreementEmail = {
  contractNumber: string;
  companyName: string;
  representativeName: string;
  representativeEmail: string;
  supplierEmail: string;
  pdfBytes: Uint8Array;
};

export type EmailDeliveryResult = {
  status: "sent" | "partial" | "failed";
  error: string | null;
};

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function sendAgreementCopies(agreement: AgreementEmail): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { status: "failed", error: "Email delivery is not configured for this deployment." };
  }

  const resend = new Resend(apiKey);
  const recipients = [...new Set([agreement.representativeEmail, agreement.supplierEmail].map((email) => email.trim().toLowerCase()))];
  const filename = `${agreement.contractNumber}.pdf`;
  const pdfContent = Buffer.from(agreement.pdfBytes).toString("base64");
  const results = await Promise.all(recipients.map(async (email) => {
    try {
      const result = await resend.emails.send({
        from,
        to: email,
        subject: `Signed PCM retainer agreement ${agreement.contractNumber}`,
        html: `<p>Hello,</p><p>The signed retainer agreement for <strong>${escapeHtml(agreement.companyName)}</strong> is attached.</p><p>Agreement: ${escapeHtml(agreement.contractNumber)}<br>Representative: ${escapeHtml(agreement.representativeName)}</p><p>Keep this PDF for your records.</p>`,
        attachments: [{ filename, content: pdfContent }],
      });
      return result.error ? { ok: false, message: result.error.message } : { ok: true, message: "" };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Email provider request failed." };
    }
  }));

  const delivered = results.filter((result) => result.ok).length;
  const status = delivered === results.length ? "sent" : delivered === 0 ? "failed" : "partial";
  const error = status === "sent"
    ? null
    : results.filter((result) => !result.ok).map((result) => result.message).join("; ").slice(0, 500);

  return { status, error };
}