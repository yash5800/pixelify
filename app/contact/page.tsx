import type { Metadata } from "next";
import ContactView from "@/components/ContactView";

export const metadata: Metadata = {
  title: "Contact & Share Feedback | Pixelify AI Studio",
  description:
    "Get in touch with the indie creators behind Pixelify. Submit feature requests, bug reports, or general feedback directly to our team.",
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  return <ContactView />;
}