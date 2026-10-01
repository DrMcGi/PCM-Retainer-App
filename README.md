# PCM Retainer Agreement App

Standalone client-facing package selection and e-signing app for the PCM retainer. This app is separate from `pcm-management-tool` and uses its own database and email-provider configuration.

## Local setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set a PostgreSQL `DATABASE_URL` and Resend credentials. The sender address must be verified with Resend. The app always sends the supplier copy to `giftk.rantho@gmail.com`; the representative email comes from the signed form.

Initialize the dedicated database once using `retainer-agreements.sql`. Do not point this app at the PCM Management Tool database unless intentionally sharing infrastructure; the agreement records contain signer names, email addresses, signatures, IP metadata, and signed PDFs.

Open `http://localhost:3000` to select a package and review its agreement. The signing endpoint stores a server timestamp and immutable terms snapshot, generates a PDF, then emails separate copies to the representative and supplier. If email delivery fails, the signed PDF is offered for download and the delivery status is returned to the client.

## Deployment

Deploy this directory as its own Next.js project. Configure `DATABASE_URL`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` in the host's secret settings. The database must be reachable by the serverless runtime and the Resend sender domain must be verified before relying on email delivery.

The typed representative email is a delivery destination, not identity verification. The app records the submitted signature, consent, timestamp, IP address, and user-agent; have the agreement reviewed for legal suitability before public use. No production host, database, or email account has been connected yet.

