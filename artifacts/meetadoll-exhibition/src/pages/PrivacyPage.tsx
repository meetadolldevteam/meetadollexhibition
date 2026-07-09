import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const logo = { url: "/assets/meetadoll-logo.jpg" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="font-display text-xl font-bold mb-4 text-foreground">{title}</h2>
    <div className="text-muted-foreground text-sm leading-relaxed space-y-3">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-5 py-4 flex items-center gap-4">
        <Link to="/" className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Link to="/">
          <img src={logo.url} alt="Meetadoll" className="h-10 w-auto" />
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-2">Legal</p>
          <h1 className="font-display text-4xl font-bold mb-3">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last Updated: July 8, 2026 &nbsp;·&nbsp; Platform: Meetadoll Exhibition &nbsp;·&nbsp; Legal Owner: Hauwa Manga &nbsp;·&nbsp; Country: Nigeria</p>
        </div>

        <Section title="1. Introduction">
          <p>Meetadoll Exhibition ("we", "us", "our") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your data.</p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We collect the following information when you use our Platform:</p>
          <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3 not-prose text-sm">
            <div>
              <p className="font-semibold text-foreground mb-1">Account Information</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Password (stored in encrypted form — never in plain text)</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Reservation Information</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Stall selection and reservation history</li>
                <li>Reservation codes and status</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Payment Information</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Transaction references and payment status</li>
                <li>We do NOT store card numbers or bank details — these are handled entirely by Paystack</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Technical Information</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>IP address</li>
                <li>Browser type</li>
                <li>Device information</li>
                <li>Usage data and activity logs</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use your information to:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Create and manage your account</li>
            <li>Process and confirm stall reservations</li>
            <li>Send reservation confirmation and event updates via email</li>
            <li>Verify payments and prevent fraud</li>
            <li>Communicate important announcements about exhibitions you have booked</li>
            <li>Improve our Platform and services</li>
            <li>Comply with legal obligations under Nigerian law</li>
          </ul>
        </Section>

        <Section title="4. How We Share Your Information">
          <p>We do not sell your personal information. We only share your data with:</p>
          <p><strong className="text-foreground">Service Providers:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Paystack — for payment processing</li>
            <li>Resend — for sending transactional emails</li>
            <li>Supabase — for secure database storage</li>
          </ul>
          <p>All third-party providers are required to handle your data securely and only for the purpose of providing their service to us.</p>
          <p><strong className="text-foreground">Legal Requirements:</strong> We may disclose your information if required to do so by Nigerian law, court order, or government authority.</p>
          <p><strong className="text-foreground">Exhibition Organizers:</strong> Your name, phone number, and reservation details may be shared with exhibition organizers for check-in and event management purposes.</p>
        </Section>

        <Section title="5. Data Security">
          <p>5.1 We implement industry-standard security measures including encrypted passwords, secure HTTPS connections, and JWT-based authentication.</p>
          <p>5.2 Access to your data is restricted to authorized personnel only.</p>
          <p>5.3 While we take every reasonable precaution, no system is completely secure. We encourage you to use a strong password and keep your login credentials confidential.</p>
        </Section>

        <Section title="6. Data Retention">
          <p>We retain your personal data for as long as your account is active or as needed to provide services. If you request account deletion, we will delete your personal data within 30 days, except where retention is required by law.</p>
        </Section>

        <Section title="7. Your Rights">
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your account and data</li>
            <li>Withdraw consent for marketing communications at any time</li>
          </ul>
          <p>To exercise any of these rights, contact us at the details below.</p>
        </Section>

        <Section title="8. Cookies">
          <p>Our Platform may use cookies to improve your browsing experience and maintain your login session. You can disable cookies in your browser settings, but this may affect Platform functionality.</p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>Our Platform is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If we discover we have collected data from a minor, we will delete it immediately.</p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. We encourage you to review this page periodically.</p>
        </Section>

        <Section title="11. Contact">
          <p>For privacy-related questions or requests, contact us at:</p>
          <div className="mt-2 rounded-xl border border-border bg-secondary/40 p-4 text-sm space-y-1 not-prose">
            <p className="font-semibold text-foreground">Meetadoll Exhibition</p>
            <p>Owner: Hauwa Manga</p>
            <p>Email: <a href="mailto:meetadollmanagement@gmail.com" className="text-primary hover:underline">meetadollmanagement@gmail.com</a></p>
            <p>WhatsApp: <a href="https://wa.me/2349063604449" target="_blank" rel="noreferrer" className="text-primary hover:underline">+234 906 360 4449</a></p>
            <p>Nigeria</p>
          </div>
        </Section>
      </main>

      <footer className="border-t border-border px-5 py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Meetadoll Exhibition. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms &amp; Conditions</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
