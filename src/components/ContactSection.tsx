import * as React from "react";
import { motion } from "framer-motion";
import AuroraButton from "./AuroraButton";
import { FiMail } from "react-icons/fi";

export default function ContactSection() {
  const TO = "hello@tristangalcik.com";

  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  // Encode safely; normalize newlines for mail clients
  const enc = (s: string) => encodeURIComponent(s.replace(/\r?\n/g, "\r\n"));

  const mailtoHref = React.useMemo(() => {
    const qs = new URLSearchParams();
    if (subject) qs.set("subject", subject);
    if (body) qs.set("body", body);
    const query = qs.toString();
    return `mailto:${TO}${query ? `?${query}` : ""}`;
  }, [subject, body]);

  // Gmail web compose fallback (opens in new tab)
  const gmailHref = React.useMemo(() => {
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: TO,
      su: subject,
      body: body,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  }, [subject, body]);

  const onSend = (e: React.MouseEvent) => {
    e.preventDefault();
    // Use window.location for default mail client
    window.location.href = mailtoHref;
  };

  return (
    <section id="contact" className="py-24">
      <div className="max-w-5xl mx-auto px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.45 }}
          className="text-center"
        >
          <h2 className="text-2xl md:text-3xl font-semibold">Contact</h2>
          <p className="mt-2 text-sm md:text-base text-white/70">
            <a
              className="text-[var(--brand)] hover:underline"
              href={`mailto:${TO}`}
            >
              {TO}
            </a>
          </p>
        </motion.div>

        {/* Glass card — matches navbar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="mt-8 flex justify-center"
        >
          <div className="w-full max-w-lg rounded-2xl border-[1.5px] border-white/10 bg-slate-500/5 backdrop-blur-lg shadow-lg text-white px-5 sm:px-6 py-6">
            {/* Controlled “form” (no native mailto action) */}
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label
                  htmlFor="subject"
                  className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/60"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-md px-3 py-2 bg-white/5 border border-white/10 outline-none transition focus:border-[var(--brand)]/40 focus:ring-2 focus:ring-[var(--brand)]/30"
                  autoComplete="off"
                />
              </div>

              <div>
                <label
                  htmlFor="body"
                  className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/60"
                >
                  Message
                </label>
                <textarea
                  id="body"
                  name="body"
                  rows={5}
                  placeholder="Your message"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded-md px-3 py-2 bg-white/5 border border-white/10 outline-none transition focus:border-[var(--brand)]/40 focus:ring-2 focus:ring-[var(--brand)]/30 resize-y"
                />
              </div>

              {/* Actions */}
              <div className="pt-1 flex flex-col items-center gap-3">
                <AuroraButton
                  size="md"
                  icon={<FiMail />}
                  outerGlow={0}
                  onClick={onSend}
                >
                  Send
                </AuroraButton>

                <a
                  href={gmailHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/70 hover:text-[var(--brand)] transition"
                >
                  Open in Gmail instead
                </a>

                {/* Hidden prebuilt anchor for long-press/alt-click users */}
                <a
                  href={mailtoHref}
                  className="sr-only"
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  Mailto
                </a>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
