import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { AGREEMENT_TERMS, AGREEMENT_VERSION, getRetainerPlan, SIGNATURE_CONSENT_TEXT, SUPPLIER_EMAIL } from "@/lib/retainer";
import { getDatabase } from "@/lib/database";
import { createAgreementPdf } from "@/lib/agreement-pdf";
import { sendAgreementCopies } from "@/lib/agreement-email";

export const runtime = "nodejs";

type RequestBody = {
  requestId?: unknown;
  agreementVersion?: unknown;
  planId?: unknown;
  representativeName?: unknown;
  representativeRole?: unknown;
  representativeEmail?: unknown;
  companyName?: unknown;
  signaturePng?: unknown;
  consented?: unknown;
  website?: unknown;
};

function textField(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function signingTimeLabel(value: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "Africa/Johannesburg",
  }).format(value);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return NextResponse.json({ error: "This signing request could not be verified." }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: "The agreement submission was invalid." }, { status: 400 });
  }

  if (textField(body.website, 200)) {
    return NextResponse.json({ error: "The agreement submission was rejected." }, { status: 400 });
  }

  const requestId = textField(body.requestId, 64);
  const agreementVersion = textField(body.agreementVersion, 80);
  const planId = textField(body.planId, 30);
  const representativeName = textField(body.representativeName, 120);
  const representativeRole = textField(body.representativeRole, 120);
  const representativeEmail = textField(body.representativeEmail, 254).toLowerCase();
  const companyName = textField(body.companyName, 140);
  const signatureMatch = typeof body.signaturePng === "string"
    ? /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(body.signaturePng)
    : null;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!validUuid(requestId) || agreementVersion !== AGREEMENT_VERSION) {
    return NextResponse.json({ error: "The agreement version has changed. Reload the page and review the current terms." }, { status: 409 });
  }
  if (!getRetainerPlan(planId) || !representativeName || !representativeRole || !companyName || !emailPattern.test(representativeEmail)) {
    return NextResponse.json({ error: "Complete the representative details and select a valid retainer package." }, { status: 400 });
  }
  if (body.consented !== true || !signatureMatch || signatureMatch[1].length > 180_000) {
    return NextResponse.json({ error: "Review the agreement, confirm signing authority, and provide your signature." }, { status: 400 });
  }

  const plan = getRetainerPlan(planId)!;
  const supplierEmail = SUPPLIER_EMAIL;

  const signedAt = new Date();
  const signedAtLabel = signingTimeLabel(signedAt);
  const agreementId = randomUUID();
  const contractNumber = `PCM-RET-${signedAt.toISOString().slice(0, 10).replaceAll("-", "")}-${agreementId.slice(0, 8).toUpperCase()}`;
  const signaturePng = Buffer.from(signatureMatch[1], "base64");
  if (signaturePng.byteLength < 100) {
    return NextResponse.json({ error: "The captured signature appears incomplete. Please sign again." }, { status: 400 });
  }

  const agreementSnapshot = {
    contractNumber,
    agreementVersion,
    plan: {
      id: plan.id,
      name: plan.name,
      monthlyFee: plan.monthlyFee,
      listFee: plan.listFee,
      allocation: plan.allocation,
      included: plan.included,
      excluded: plan.excluded,
    },
    companyName,
    representativeName,
    representativeRole,
    representativeEmail,
    signedAt: signedAt.toISOString(),
    signedAtLabel,
    terms: AGREEMENT_TERMS,
    consentText: SIGNATURE_CONSENT_TEXT,
  };

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await createAgreementPdf({
      contractNumber,
      agreementVersion,
      plan,
      companyName,
      representativeName,
      representativeRole,
      representativeEmail,
      signedAtLabel,
      consentText: SIGNATURE_CONSENT_TEXT,
      signaturePng,
      terms: AGREEMENT_TERMS,
    });
  } catch {
    return NextResponse.json({ error: "The signature image could not be processed. Please clear it and sign again." }, { status: 400 });
  }

  const signerIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 100) ?? null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  try {
    const database = getDatabase();
    await database`
      INSERT INTO retainer_agreements (
        id, request_id, contract_number, agreement_version, plan_id, monthly_fee, list_fee,
        company_name, representative_name, representative_role, representative_email,
        signature_png, signed_at, signer_ip, signer_user_agent, agreement_snapshot, pdf_bytes
      ) VALUES (
        ${agreementId}::uuid, ${requestId}::uuid, ${contractNumber}, ${agreementVersion}, ${plan.id},
        ${plan.monthlyFee}, ${plan.listFee}, ${companyName}, ${representativeName}, ${representativeRole},
        ${representativeEmail}, ${signaturePng}, ${signedAt.toISOString()}, ${signerIp}, ${userAgent},
        ${JSON.stringify(agreementSnapshot)}::jsonb, ${Buffer.from(pdfBytes)}
      )
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : "database error";
    if (/unique|duplicate/i.test(message)) {
      try {
        const database = getDatabase();
        const existingRows = await database`
          SELECT contract_number, email_status, email_error, pdf_bytes
          FROM retainer_agreements
          WHERE request_id = ${requestId}::uuid
          LIMIT 1
        `;
        const existing = existingRows[0];
        if (existing) {
          const existingStatus = existing.email_status === "sent" || existing.email_status === "partial"
            ? existing.email_status
            : "failed";
          return NextResponse.json({
            contractNumber: existing.contract_number,
            emailStatus: existingStatus,
            emailMessage: existing.email_error,
            pdfBase64: Buffer.from(existing.pdf_bytes).toString("base64"),
          }, { status: 200 });
        }
      } catch {
        // Fall through to a generic duplicate response if recovery lookup fails.
      }
      return NextResponse.json({ error: "This signing submission has already been received. Contact the supplier before submitting again." }, { status: 409 });
    }
    return NextResponse.json({ error: "The agreement could not be securely recorded. Please contact the supplier before retrying." }, { status: 503 });
  }

  const delivery = await sendAgreementCopies({
    contractNumber,
    companyName,
    representativeName,
    representativeEmail,
    supplierEmail,
    pdfBytes,
  });

  try {
    const database = getDatabase();
    await database`
      UPDATE retainer_agreements
      SET email_status = ${delivery.status},
          email_error = ${delivery.error},
          email_sent_at = ${delivery.status === "sent" ? new Date().toISOString() : null}
      WHERE id = ${agreementId}::uuid
    `;
  } catch {
    // The signed record and PDF are already stored; delivery status remains pending if this update fails.
  }

  return NextResponse.json({
    contractNumber,
    emailStatus: delivery.status,
    emailMessage: delivery.error,
    pdfBase64: Buffer.from(pdfBytes).toString("base64"),
  }, { status: 201 });
}