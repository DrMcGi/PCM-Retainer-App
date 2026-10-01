export const AGREEMENT_VERSION = "PCM-RET-2026-10-01-v1";
export const SUPPLIER_EMAIL = "giftk.rantho@gmail.com";
export const SIGNATURE_CONSENT_TEXT = "I confirm I am authorised to accept this agreement for the organisation, have reviewed the selected package and terms, and intend my electronic signature to signify acceptance.";

export type RetainerPlan = {
  id: "essential" | "standard" | "ownership";
  name: string;
  monthlyFee: number;
  listFee: number;
  tagline: string;
  included: string[];
  excluded: string[];
  allocation: string;
};

export const RETAINER_PLANS: RetainerPlan[] = [
  {
    id: "essential",
    name: "Essential Support",
    monthlyFee: 7000,
    listFee: 8500,
    tagline: "Operational continuity for the existing PCM Management Tool.",
    included: [
      "Uptime and availability checks",
      "Minor bug fixes within the existing approved scope",
      "Minor workbook and data-handling adjustments",
      "Routine dependency and package maintenance",
      "Hosting and routine operational maintenance for the existing app during the active agreement",
      "Domain, email-delivery, and paid notification infrastructure costs during the active agreement",
      "Standard support by email or WhatsApp",
      "Normal support response target of 24 to 48 hours",
    ],
    excluded: [
      "Major feature additions or new modules",
      "Major redesigns or workflow changes",
      "Large reporting expansions or integrations",
      "Emergency or after-hours support unless separately agreed",
    ],
    allocation: "Scope-based support only. No monthly development-hour bank is included.",
  },
  {
    id: "standard",
    name: "Standard Managed",
    monthlyFee: 12000,
    listFee: 12000,
    tagline: "Priority operating support with a limited monthly improvement allocation.",
    included: [
      "Everything in Essential Support",
      "Ongoing workbook and data-handling support",
      "Admin and user support assistance",
      "Security and package maintenance",
      "Small UX and operational refinements",
      "Priority response times",
      "Up to 8 support and development hours per month",
      "Hosting and routine operational maintenance for the existing app during the active agreement",
      "Domain, email-delivery, and paid notification infrastructure costs during the active agreement",
    ],
    excluded: [
      "Major new features or modules",
      "Major workflow redesigns or large reporting expansions",
      "New third-party integrations",
    ],
    allocation: "Up to 8 support and development hours per month; unused hours do not roll over.",
  },
  {
    id: "ownership",
    name: "Product Ownership",
    monthlyFee: 18000,
    listFee: 18000,
    tagline: "Ongoing technical ownership and planned product improvement.",
    included: [
      "Everything in Standard Managed",
      "Regular feature development within an agreed monthly roadmap",
      "Reporting and notification refinements",
      "Authentication and permission-model updates",
      "Deployment management and continuous improvement support",
      "Active monthly technical ownership",
      "Hosting and routine operational maintenance for the existing app during the active agreement",
      "Domain, email-delivery, and paid notification infrastructure costs during the active agreement",
    ],
    excluded: [
      "Major new modules or material workflow redesigns unless separately scoped",
      "Emergency after-hours support unless separately agreed",
    ],
    allocation: "Planned product work is agreed in writing each month; no unlimited development is included.",
  },
];

export function getRetainerPlan(id: string) {
  return RETAINER_PLANS.find((plan) => plan.id === id) ?? null;
}

export const AGREEMENT_TERMS = [
  {
    title: "Selected service boundary",
    body: "The selected retainer covers only the services listed for that package. It is not an open-ended commitment to provide any service PCM requests. The Essential Support offer at R7,000 per month is a PCM-specific negotiated price against the R8,500 list price and is limited to the Essential Support scope shown above.",
  },
  {
    title: "New features and out-of-scope work",
    body: "Major feature additions, new modules, major workflow changes, large reporting expansions, new integrations, redesigns, and any other work outside the selected package are excluded. The supplier is not required to design, build, or deliver excluded work under the monthly fee. Such work will proceed only under a separate written quote or estimate approved by both parties before work starts. No promise of future retainer selection authorizes unpaid work.",
  },
  {
    title: "Term and renewal",
    body: "The initial fixed term is 12 months, starting at the server-recorded signing timestamp. After the initial term, the agreement renews month-to-month unless either party gives at least 30 days' written notice before the next renewal date. Notice does not cancel amounts already due or work separately approved.",
  },
  {
    title: "Fees and payment",
    body: "The selected monthly fee is billed in advance. The negotiated R7,000 Essential Support fee applies only to PCM and is shown against its R8,500 list price. No VAT is charged or added under this agreement. For as long as this agreement remains active and paid, the supplier will keep the existing app hosted and provide routine operational maintenance at no separate charge. Domain, email-delivery, and paid notification infrastructure costs required for the existing app are also included during the active contract term. After termination, non-renewal, or non-payment, continued hosting, maintenance, domains, email delivery, and paid notification services may be discontinued or charged separately under a new written arrangement.",
  },
  {
    title: "Support and allocation",
    body: "Normal support is provided by email or WhatsApp. Essential Support is scope-based and includes no monthly development-hour bank. Standard Managed includes up to 8 support/development hours per month; unused hours do not roll over. Product Ownership follows a monthly written roadmap. Response targets are not guaranteed resolution times.",
  },
  {
    title: "Approval and record",
    body: "The representative confirms they are authorised to accept this agreement for the client. The selected package, fee, agreement version, terms, representative details, drawn signature, signing timestamp, and delivery status are recorded. A PDF copy is emailed to the representative and supplier. The typed email address is used for delivery and is not independently identity-verified by this app.",
  },
  {
    title: "Agreement records and personal information",
    body: "The app stores the representative's name, role, email, drawn signature, agreement details, server timestamp, and limited request metadata to administer and evidence this agreement. A signed PDF copy is emailed to the representative and supplier. The representative should submit only details they are authorised to provide. Records are retained for contract administration and applicable recordkeeping requirements.",
  },
];