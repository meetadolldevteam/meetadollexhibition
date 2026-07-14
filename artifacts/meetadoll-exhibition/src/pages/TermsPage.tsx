import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const logo = { url: "/assets/meetadoll-logo.jpg" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="font-display text-xl font-bold mb-4 text-foreground">{title}</h2>
    <div className="text-muted-foreground text-sm leading-relaxed space-y-3">{children}</div>
  </section>
);

export default function TermsPage() {
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
          <h1 className="font-display text-4xl font-bold mb-3">Terms &amp; Conditions</h1>
          <p className="text-muted-foreground text-sm">Last Updated: July 8, 2026 &nbsp;·&nbsp; Platform: Meetadoll Exhibition &nbsp;·&nbsp; Legal Owner: Hauwa Manga &nbsp;·&nbsp; Country: Nigeria</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>By accessing or using the Meetadoll Exhibition platform ("Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, you must not use this Platform. These terms apply to all visitors, vendors, and users of the Platform.</p>
        </Section>

        <Section title="2. About the Platform">
          <p>Meetadoll Exhibition is an online stall reservation platform where vendors can book exhibition stalls for events organized or listed by Meetadoll. The Platform handles reservations and payments but does not directly organize all listed exhibitions.</p>
        </Section>

        <Section title="3. User Accounts">
          <p>3.1 You must provide accurate, complete, and current information when registering an account.</p>
          <p>3.2 You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately at the contact details below if you suspect unauthorized access to your account.</p>
          <p>3.3 You must be at least 18 years old to create an account and make a reservation.</p>
          <p>3.4 We reserve the right to suspend or terminate accounts that provide false information or violate these Terms.</p>
        </Section>

        <Section title="4. Stall Reservations">
          <p>4.1 A reservation is only confirmed after full payment has been received and verified by our payment processor.</p>
          <p>4.2 When you select a stall, it is placed on a temporary hold for a maximum of 15 minutes. If payment is not completed within this period, the hold is released and the stall becomes available to other vendors.</p>
          <p>4.3 A reservation confirmation email containing your reservation details will be sent to your registered email address upon successful payment.</p>
          <p>4.4 Meetadoll reserves the right to cancel a reservation if payment is found to be fraudulent, if the vendor violates these Terms, or if circumstances beyond our control require it.</p>
          <p>4.5 Stall assignments are final once confirmed. Requests to change stall numbers or locations are subject to availability and are at the sole discretion of Meetadoll.</p>
        </Section>

        <Section title="5. Payments">
          <p>5.1 All payments are processed securely through Paystack. Meetadoll does not store your card details.</p>
          <p>5.2 All prices are listed in Nigerian Naira (NGN) unless otherwise stated.</p>
          <p>5.3 Payment must be made in full at the time of reservation. We do not offer installment payments unless explicitly stated for a specific exhibition.</p>
          <p>5.4 By making a payment, you confirm that you are authorized to use the payment method provided.</p>
          <p>5.5 In the event of a failed transaction where your account was debited but no confirmation was received, please contact us within 48 hours with your transaction reference number.</p>
        </Section>

        <Section title="6. Refund and Cancellation Policy">
          <p>6.1 <strong className="text-foreground">Cancellation by Vendor:</strong> Reservations cancelled are non-refundable.</p>
          <p>6.2 <strong className="text-foreground">Cancellation by Meetadoll:</strong> If Meetadoll cancels an exhibition, vendors will receive a full refund of the amount paid within 7 to 14 business days.</p>
          <p>6.3 <strong className="text-foreground">Postponement:</strong> If an exhibition is postponed, your reservation will be automatically transferred to the new date. If you cannot attend the new date, you may request a full refund within 7 days of the postponement announcement.</p>
          <p>6.4 Refunds are processed through the original payment method and may take 5 to 10 business days to reflect.</p>
        </Section>

        <Section title="7. Vendor Conduct">
          <p>7.1 Vendors must only sell products or services that are legal under Nigerian law.</p>
          <p>7.2 Vendors must not sell counterfeit, stolen, or prohibited goods.</p>
          <p>7.3 Vendors are responsible for obtaining any licenses, permits, or certifications required for their products or services.</p>
          <p>7.4 Vendors must maintain their stalls in a clean and orderly condition during the exhibition.</p>
          <p>7.5 Meetadoll reserves the right to remove any vendor from an exhibition without a refund if they are found to be in breach of these conduct rules or Nigerian law.</p>
        </Section>

        <Section title="8. Intellectual Property">
          <p>8.1 All content on this Platform including logos, designs, text, and graphics are the property of Meetadoll and may not be copied, reproduced, or used without written permission.</p>
          <p>8.2 By submitting any content to the Platform (such as business descriptions or logos), you grant Meetadoll a non-exclusive license to use that content for promotional purposes related to the exhibition.</p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>9.1 Meetadoll is not liable for any loss of profit, revenue, or business suffered by vendors as a result of attending or not attending an exhibition.</p>
          <p>9.2 Meetadoll is not responsible for theft, damage, or loss of vendor property during an exhibition.</p>
          <p>9.3 Our total liability to you in connection with any reservation shall not exceed the amount you paid for that reservation.</p>
          <p>9.4 Nothing in these Terms limits liability for fraud, personal injury, or any other liability that cannot be excluded under Nigerian law.</p>
        </Section>

        <Section title="10. Force Majeure">
          <p>Meetadoll shall not be liable for any failure to perform its obligations due to circumstances beyond its reasonable control, including but not limited to natural disasters, government actions, civil unrest, pandemics, or power failures.</p>
        </Section>

        <Section title="11. Governing Law">
          <p>These Terms and Conditions are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from these Terms shall be subject to the jurisdiction of Nigerian courts.</p>
        </Section>

        <Section title="12. Changes to Terms">
          <p>Meetadoll reserves the right to update these Terms at any time. Changes will be posted on this page with an updated date. Continued use of the Platform after changes constitutes acceptance of the new Terms.</p>
        </Section>

        <Section title="13. Contact">
          <p>For any questions regarding these Terms, contact us at:</p>
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
