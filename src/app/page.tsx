"use client";

import { useRef, useState, type FormEvent } from "react";
import SignaturePad from "@/components/signature-pad";
import { AGREEMENT_TERMS, AGREEMENT_VERSION, RETAINER_PLANS, SIGNATURE_CONSENT_TEXT } from "@/lib/retainer";

type SigningResult = {
  contractNumber?: string;
  emailStatus?: "sent" | "partial" | "failed";
  emailMessage?: string;
  pdfBase64?: string;
};

export default function Home() {
  const [selectedPlanId, setSelectedPlanId] = useState("essential");
  const [signature, setSignature] = useState("");
  const [consented, setConsented] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [emailStatus, setEmailStatus] = useState<"sent" | "partial" | "failed" | null>(null);
  const requestId = useRef("");
  const selectedPlan = RETAINER_PLANS.find((plan) => plan.id === selectedPlanId) ?? RETAINER_PLANS[0];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setResultMessage("");
    setEmailStatus(null);
    if (!requestId.current) requestId.current = crypto.randomUUID();

    try {
      const response = await fetch("/api/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId.current,
          agreementVersion: AGREEMENT_VERSION,
          planId: selectedPlanId,
          representativeName: form.get("representativeName"),
          representativeRole: form.get("representativeRole"),
          representativeEmail: form.get("representativeEmail"),
          companyName: form.get("companyName"),
          signaturePng: signature,
          consented,
          website: form.get("website"),
        }),
      });
      const payload = await response.json() as SigningResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "The agreement could not be signed. Please try again.");
      }

      setEmailStatus(payload.emailStatus ?? "failed");
      setIsSigned(true);
      const deliveryNote = payload.emailMessage ? ` Delivery detail: ${payload.emailMessage}` : "";
      setResultMessage(payload.emailStatus === "sent"
        ? `Agreement ${payload.contractNumber} was signed. PDF copies were emailed to the representative and supplier.`
        : payload.emailStatus === "partial"
          ? `Agreement ${payload.contractNumber} was recorded, but only one email copy was delivered. Download the PDF below and contact the supplier.${deliveryNote}`
          : `Agreement ${payload.contractNumber} was recorded, but the email could not be delivered. Download the PDF below and contact the supplier.${deliveryNote}`);

      if (payload.pdfBase64) {
        const binary = window.atob(payload.pdfBase64);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const pdfUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `${payload.contractNumber || "signed-retainer"}.pdf`;
        link.click();
        URL.revokeObjectURL(pdfUrl);
      }
    } catch (error) {
      setResultMessage(error instanceof Error ? error.message : "The agreement could not be signed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="site-shell">
      <header className="masthead">
        <a className="brand-lockup" href="#top" aria-label="DrMcGi's SaaS Atelier home">
          <img className="brand-logo" src="/logo.svg" alt="DrMcGi's SaaS Atelier" />
          <span className="brand-copy">
            <span className="eyebrow">Retainer Workspace</span>
            <span className="workspace-title">PCM Management Tool</span>
            <span className="hero-copy">Support options and service agreement</span>
          </span>
        </a>
        <span className="masthead-label">PCM · Service Agreement</span>
      </header>

      <section className="intro-band" id="top">
        <div className="intro-inner">
          <p className="eyebrow">Retainer selection · PCM Management Tool</p>
          <h1>Support, with a clear scope.</h1>
          <p className="intro-copy">Choose a service level, review what it covers, then complete the agreement for your organisation.</p>
          <div className="contract-facts" aria-label="Agreement terms at a glance">
            <span>12-month initial term</span>
            <span>Monthly billing in advance</span>
            <span>30 days&apos; written non-renewal notice</span>
          </div>
        </div>
      </section>

      <div className="content-wrap">
        <section className="section-block plan-section" aria-labelledby="plans-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / Select a package</p>
              <h2 id="plans-heading">Choose the support level</h2>
            </div>
            <p className="section-note">Your selected package and monthly fee will be included in the signed PDF.</p>
          </div>

          <div className="plan-grid" role="radiogroup" aria-label="Retainer packages">
            {RETAINER_PLANS.map((plan, index) => (
              <button
                className={`plan-option ${selectedPlanId === plan.id ? "is-selected" : ""}`}
                type="button"
                role="radio"
                aria-checked={selectedPlanId === plan.id}
                disabled={isSigned}
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <span className="plan-index">0{index + 1}</span>
                <span className="plan-name">{plan.name}</span>
                {plan.id === "essential" ? (
                  <span className="price-stack">
                    <span className="list-price">R8,500 list</span>
                    <strong>R7,000<span> / month</span></strong>
                    <span className="offer-note">PCM negotiated rate</span>
                  </span>
                ) : (
                  <strong className="standard-price">R{plan.monthlyFee.toLocaleString("en-ZA")}<span> / month</span></strong>
                )}
                <span className="plan-tagline">{plan.tagline}</span>
                <span className="plan-allocation">{plan.allocation}</span>
                <span className="selection-state">{selectedPlanId === plan.id ? "Selected" : "Select package"}</span>
              </button>
            ))}
          </div>

          <div className="scope-columns" aria-live="polite">
            <section className="scope-panel">
              <p className="eyebrow">Included · {selectedPlan.name}</p>
              <ul>{selectedPlan.included.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section className="scope-panel exclusion-panel">
              <p className="eyebrow">Not included</p>
              <ul>{selectedPlan.excluded.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          </div>
        </section>

        <section className="section-block terms-section" aria-labelledby="terms-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">02 / Agreement terms</p>
              <h2 id="terms-heading">Read before signing</h2>
            </div>
            <div className="selected-fee">
              <span>Selected monthly fee</span>
              <strong>R{selectedPlan.monthlyFee.toLocaleString("en-ZA")}</strong>
            </div>
          </div>

          <div className="terms-list">
            {AGREEMENT_TERMS.map((term, index) => (
              <article className="term-row" key={term.title}>
                <span className="term-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{term.title}</h3>
                  <p>{term.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block signing-section" aria-labelledby="sign-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">03 / Representative acceptance</p>
              <h2 id="sign-heading">Complete and sign</h2>
            </div>
            <p className="section-note">A server timestamp is added when the agreement is accepted.</p>
          </div>

          <form className="signing-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>Organisation</span>
                <input name="companyName" autoComplete="organization" defaultValue="PCM Group" required maxLength={140} disabled={isSigned} />
              </label>
              <label className="field">
                <span>Representative full name</span>
                <input name="representativeName" autoComplete="name" required maxLength={120} disabled={isSigned} />
              </label>
              <label className="field">
                <span>Role / position</span>
                <input name="representativeRole" autoComplete="organization-title" required maxLength={120} disabled={isSigned} />
              </label>
              <label className="field">
                <span>Representative email</span>
                <input name="representativeEmail" type="email" autoComplete="email" required maxLength={254} disabled={isSigned} />
              </label>
            </div>

            <div className="signature-block">
              <div className="signature-heading">
                <div>
                  <p className="eyebrow">Electronic signature</p>
                  <p>Sign in the box using a mouse, touch screen, or stylus.</p>
                </div>
                <SignaturePad onChange={setSignature} disabled={isSigned} />
              </div>
            </div>

            <label className="consent-row">
              <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} required disabled={isSigned} />
              <span>{SIGNATURE_CONSENT_TEXT}</span>
            </label>

            <label className="honeypot" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>

            <div className="submit-row">
              <p>Signing records the selected package, terms version, signature, and server timestamp.</p>
              <button className="submit-button" type="submit" disabled={isSubmitting || isSigned || !signature || !consented}>
                {isSubmitting ? "Recording agreement…" : isSigned ? "Agreement recorded" : `Sign ${selectedPlan.name}`}
              </button>
            </div>
          </form>

          {resultMessage && (
            <div className={`result-message ${emailStatus === "sent" ? "is-success" : ""}`} role="status">
              {resultMessage}
            </div>
          )}
        </section>
      </div>

      <footer className="site-footer">
        <span>DrMcGi&apos;s SaaS Atelier (Pty) Ltd.</span>
        <span>PCM Management Tool · Retainer agreement</span>
      </footer>
    </main>
  );
}
