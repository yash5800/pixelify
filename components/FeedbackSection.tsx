
"use client";

import React, {
  useState,
  useRef,
  useEffect,
} from "react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import emailjs from "@emailjs/browser";
import {
  MessageSquare,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Bug,
  Lightbulb,
  Mail,
  User,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";

// --------------------------------------------------
// UI COMPONENTS
// --------------------------------------------------

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-[#111114] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function Button({
  variant = "default",
  size = "default",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50";

  const sizes = {
    sm: "px-3 py-2 text-xs",
    default: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-sm",
  };

  const variants = {
    default:
      "bg-violet-500 text-white hover:bg-violet-400 active:scale-[0.98]",
    outline:
      "bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] hover:text-white",
    secondary:
      "bg-white/[0.08] text-neutral-200 hover:bg-white/[0.12]",
    ghost:
      "bg-transparent text-neutral-400 hover:bg-white/[0.06] hover:text-white",
  };

  return (
    <button
      {...props}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// --------------------------------------------------
// TOAST SYSTEM
// --------------------------------------------------

export interface ToastOptions {
  type?: "success" | "error" | "info" | "warning";
  title?: string;
  description?: string;
}

export interface ToastItem extends ToastOptions {
  id: string;
}

type ToastSubscriber = (items: ToastItem[]) => void;

let activeToasts: ToastItem[] = [];
const subscribers = new Set<ToastSubscriber>();
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

function publishToasts(items: ToastItem[]) {
  activeToasts = items;
  subscribers.forEach((subscriber) => subscriber(items));
}

export function addToast(toast: ToastOptions) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  publishToasts([...activeToasts, { ...toast, id }]);

  const timer = setTimeout(() => {
    removeToast(id);
  }, 4500);

  toastTimers.set(id, timer);
}

export function removeToast(id: string) {
  const timer = toastTimers.get(id);

  if (timer) {
    clearTimeout(timer);
    toastTimers.delete(id);
  }

  publishToasts(activeToasts.filter((item) => item.id !== id));
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(activeToasts);

  useEffect(() => {
    subscribers.add(setToasts);
    setToasts(activeToasts);

    return () => {
      subscribers.delete(setToasts);
    };
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
  };
}

let hasToastContainer = false;

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (hasToastContainer) return;

    hasToastContainer = true;
    setIsPrimary(true);

    return () => {
      hasToastContainer = false;
    };
  }, []);

  if (!isPrimary || !toasts.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[99999] flex w-[calc(100vw-2.5rem)] max-w-sm flex-col gap-2.5">
      <AnimatePresence>
        {toasts.map((toast) => {
          const success = toast.type === "success";
          const error = toast.type === "error";

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl bg-[#19191E] p-4 shadow-2xl shadow-black/30"
            >
              <div className="mt-0.5 shrink-0 text-violet-400">
                {success ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : error ? (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                ) : (
                  <MessageSquare className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                {toast.title && (
                  <p className="text-sm font-semibold text-white">
                    {toast.title}
                  </p>
                )}

                {toast.description && (
                  <p className="mt-1 break-words text-xs leading-relaxed text-neutral-400">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => removeToast(toast.id)}
                className="text-neutral-500 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// --------------------------------------------------
// FEEDBACK SECTION
// --------------------------------------------------

export function FeedbackSection({
  defaultOpen = false,
  showFullContactLink = true,
}: {
  defaultOpen?: boolean;
  showFullContactLink?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        id="feedback"
        className="mt-4 sm:mt-6 scroll-mt-20"
      >
        <FeedbackCard
          isOpen={isOpen}
          onToggleOpen={() => setIsOpen((previous) => !previous)}
          showFullContactLink={showFullContactLink}
        />
      </motion.section>

      <ToastContainer />
    </>
  );
}

function FeedbackCard({
  isOpen,
  onToggleOpen,
  showFullContactLink = true,
}: {
  isOpen: boolean;
  onToggleOpen: () => void;
  showFullContactLink?: boolean;
}) {
  return (
    <Card className="mx-auto max-w-2xl p-5 sm:p-7">
      <NoticeSection />

      <div className="mt-4 sm:mt-5 space-y-3.5 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
          <MessageSquare className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-white">
            Love PIXELIFY?
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-400">
            Have an idea, found a bug, or want to suggest an improvement?
            We&apos;d love to hear from you.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 pt-1 sm:flex-row">
          <Button
            size="lg"
            type="button"
            onClick={onToggleOpen}
          >
            <MessageSquare className="h-4 w-4" />
            {isOpen ? "Hide Feedback Form" : "Share Feedback"}
          </Button>

          {showFullContactLink && (
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              Contact us <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden pt-3 text-left"
            >
              <FeedbackForm onClose={onToggleOpen} />
            </motion.div>
          )}
        </AnimatePresence>

        <p className="pt-2 text-xs text-neutral-600">
          Made with care by indie developers.
        </p>
      </div>
    </Card>
  );
}

function NoticeSection() {
  return (
    <div className="rounded-xl bg-white/[0.035] p-4">
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />

        <div>
          <p className="text-sm font-medium text-neutral-200">
            About processing speed
          </p>

          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            PIXELIFY processes images locally in your browser. Speed depends
            on your device, GPU, and selected model.
          </p>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// FEEDBACK FORM
// --------------------------------------------------

const categories = [
  { id: "feedback", label: "Feedback", icon: MessageCircle },
  { id: "feature", label: "Feature", icon: Lightbulb },
  { id: "bug", label: "Bug report", icon: Bug },
  { id: "other", label: "Question", icon: Mail },
] as const;

const categoryLabels: Record<string, string> = {
  feedback: "General Feedback",
  feature: "Feature Request",
  bug: "Bug Report",
  other: "Question / Other",
};

export function FeedbackForm({
  onClose,
  standalone = false,
}: {
  onClose?: () => void;
  standalone?: boolean;
}) {
  const { addToast } = useToast();

  const [isSending, setIsSending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [category, setCategory] = useState("feedback");

  const formRef = useRef<HTMLFormElement>(null);

  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const recipientEmail =
    process.env.NEXT_PUBLIC_FEEDBACK_TO_EMAIL?.trim();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!publicKey || !serviceId || !templateId || !recipientEmail) {
      addToast({
        type: "error",
        title: "Service unavailable",
        description: "The feedback service is not configured yet.",
      });
      return;
    }

    if (!formRef.current) return;

    const formData = new FormData(formRef.current);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !message) {
      addToast({
        type: "error",
        title: "Missing information",
        description: "Please complete all required fields.",
      });
      return;
    }

    if (message.length > 5000) {
      addToast({
        type: "error",
        title: "Message too long",
        description: "Please keep your message under 5,000 characters.",
      });
      return;
    }

    setIsSending(true);

    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          name,
          email,
          message: `${message}`,
          title: `PIXELIFY: ${categoryLabels[category]} from ${name}`,
          client_email: recipientEmail,
          to_email: recipientEmail,
          reply_to: email,
        },
        { publicKey }
      );

      setIsSubmitted(true);

      addToast({
        type: "success",
        title: "Message sent",
        description: "Thank you for helping us improve PIXELIFY.",
      });
    } catch (error) {
      const description =
        typeof error === "object" &&
        error !== null &&
        "text" in error
          ? String(
              (error as { text?: string }).text ||
                "Please try again in a moment."
            )
          : "Please try again in a moment.";

      addToast({
        type: "error",
        title: "Couldn't send your message",
        description,
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>

        <h3 className="text-lg font-semibold text-white">
          Message sent successfully
        </h3>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-400">
          Thanks for reaching out. We&apos;ll review your message and respond
          if follow-up is needed.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsSubmitted(false);
              setCategory("feedback");
              formRef.current?.reset();
            }}
          >
            Send another
          </Button>

          {onClose && (
            <Button type="button" size="sm" onClick={onClose}>
              Done
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`w-full ${
          standalone ? "max-w-none" : "mt-2 max-w-none"
        }`}
      >

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-5 text-left"
        >
          {/* Category */}
          <fieldset>
            <legend className="mb-2.5 text-xs font-medium text-neutral-400">
              What&apos;s this about?
            </legend>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {categories.map((item) => {
                const Icon = item.icon;
                const selected = category === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCategory(item.id)}
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                      selected
                        ? "bg-violet-500/15 text-violet-300"
                        : "bg-white/[0.035] text-neutral-400 hover:bg-white/[0.07] hover:text-neutral-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Name and email */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={standalone ? "contact-name" : "feedback-name"}
                className="mb-2 block text-xs font-medium text-neutral-400"
              >
                Your name
              </label>

              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />

                <input
                  type="text"
                  name="name"
                  id={standalone ? "contact-name" : "feedback-name"}
                  autoComplete="name"
                  maxLength={100}
                  required
                  className="w-full rounded-lg bg-white/[0.035] py-3 pl-10 pr-3 text-sm text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:bg-white/[0.055] focus:ring-1 focus:ring-violet-400/50"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor={standalone ? "contact-email" : "feedback-email"}
                className="mb-2 block text-xs font-medium text-neutral-400"
              >
                Email address
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />

                <input
                  type="email"
                  name="email"
                  id={standalone ? "contact-email" : "feedback-email"}
                  autoComplete="email"
                  maxLength={254}
                  required
                  className="w-full rounded-lg bg-white/[0.035] py-3 pl-10 pr-3 text-sm text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:bg-white/[0.055] focus:ring-1 focus:ring-violet-400/50"
                  placeholder="you@example.com"
                />
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor={standalone ? "contact-message" : "feedback-message"}
                className="text-xs font-medium text-neutral-400"
              >
                Your message
              </label>

              <span className="text-[10px] text-neutral-600">
                Max. 5,000 characters
              </span>
            </div>

            <textarea
              name="message"
              id={standalone ? "contact-message" : "feedback-message"}
              required
              rows={4}
              maxLength={5000}
              className="w-full resize-y rounded-lg bg-white/[0.035] px-3.5 py-3 text-sm leading-relaxed text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:bg-white/[0.055] focus:ring-1 focus:ring-violet-400/50"
              placeholder="Tell us what you think, describe a problem, or share an idea..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] leading-relaxed text-neutral-600">
              Your message is sent securely through our email provider.
            </p>

            <div className="flex shrink-0 items-center gap-2">
              {onClose && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                size="default"
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}

                {isSending ? "Sending..." : "Send message"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <ToastContainer />
    </>
  );
}