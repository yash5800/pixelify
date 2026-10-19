import React from 'react';
import type { ViewTab } from '../../types';
import PageShell, { Section, P, UL, Callout } from './PageShell';

interface Props {
  onTabChange: (tab: ViewTab) => void;
}

const TOC = [
  { id: 'acceptance', label: 'Acceptance' },
  { id: 'service', label: 'The service' },
  { id: 'your-content', label: 'Your content' },
  { id: 'acceptable', label: 'Acceptable use' },
  { id: 'ai-output', label: 'AI output' },
  { id: 'ip', label: 'Intellectual property' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'liability', label: 'Liability' },
  { id: 'changes', label: 'Changes & termination' },
  { id: 'law', label: 'Governing law' },
  { id: 'contact', label: 'Contact' },
];

export default function TermsPage({ onTabChange }: Props) {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of Service"
      description="The agreement covering your use of Pixelify. It is deliberately short and in plain
      language: use the tools, don't abuse them, and understand what an AI reconstruction is."
      updated="Last updated: October 12, 2026"
      toc={TOC}
      documentTitle="Terms of Service: Pixelify"
      metaDescription="Pixelify's terms of service: acceptable use, ownership of your images, AI output
      disclaimers, liability limits and contact details."
      onTabChange={onTabChange}
    >
      <Section id="acceptance" num={1} title="Acceptance">
        <P>
          These Terms of Service ("Terms") govern your use of Pixelify, including the AI Image
          Upscaler, the Background Remover and the Blog &amp; Guides (together, "the service"). By
          using the service you agree to these Terms. If you do not agree, please do not use it.
        </P>
        <P>
          The service is provided free of charge. No account is created and no payment information
          is collected, so there is nothing further you must do to accept these Terms beyond using
          the site.
        </P>
      </Section>

      <Section id="service" num={2} title="The service">
        <P>
          Pixelify is a client-side web application that performs image upscaling and background
          removal in your browser. We provide it on an "as available" basis: we may add, change or
          remove features, models and export options at any time, and we may suspend or discontinue
          the service in whole or in part without notice. Because there is no server component, we
          cannot promise uptime, support response times, or continued availability of any specific
          model.
        </P>
        <P>
          The service is intended for personal and commercial image editing. It is not intended
          where failure could lead to death, personal injury, or severe environmental harm (i.e.
          do not use it as the sole step in safety-critical, medical, legal or forensic workflows).
        </P>
      </Section>

      <Section id="your-content" num={3} title="Your content">
        <P>
          <strong>You keep full ownership of every image you process.</strong> Because processing
          happens on your device, you never upload content to us, you grant us no licence over it,
          and we obtain no copy of it. We cannot sublicense, analyse, or train on images we do not
          have.
        </P>
        <P>
          You are solely responsible for the images you choose to process and for the outputs you
          produce with them. You must have the rights or consent required for whatever you process.
          For example, you should not use the tools on content you are not permitted to use, and
          you should obtain consent before enhancing or publishing identifiable people's likenesses
          where the law requires it.
        </P>
        <P>
          Outputs belong to you as well, subject to the AI-output caveat in section 5 and to the
          rights of any third parties whose material was in your input.
        </P>
      </Section>

      <Section id="acceptable" num={4} title="Acceptable use">
        <P>You agree not to use the service to:</P>
        <UL
          items={[
            'violate any applicable law, regulation, or another person’s rights, including privacy, publicity and intellectual-property rights;',
            'create or distribute content that is unlawful, deceptive, or intended to harass, defame or exploit;',
            'upload material you have no right to process;',
            'interfere with or disrupt the service, including attempts to reverse-engineer, probe, overload, scrape at scale, or bypass technical limits imposed by your own browser’s memory;',
            'use automated scripts to hammer the site in a way that degrades it for others, or reproduce substantial portions of the service for a competing offering without our written permission.',
          ]}
        />
        <P>
          The tools run on your own hardware, so most abuse of the service is self-limiting, but
          these rules still apply to how you use outputs and the site itself.
        </P>
      </Section>

      <Section id="ai-output" num={5} title="AI output">
        <P>
          This is the section worth reading twice. Neural super-resolution and segmentation do not
          recover truth from nowhere; they <strong>reconstruct plausible detail</strong>. That has
          predictable consequences:
        </P>
        <UL
          items={[
            'Upscaled text, fine patterns, logos and dense textures may be rendered as plausible but incorrect detail.',
            'Face restoration moves a blurry face toward a learned ideal, not necessarily the original person.',
            'Background removal can occasionally mis-segment hair, fur or transparent objects.',
          ]}
        />
        <P>
          Outputs are provided for creative and editing purposes. <strong>Do not treat them as
          evidence, records, or verified reproductions</strong>. Do not rely on an output for
          identification documents, medical, legal or financial records, or any purpose where
          fabricated detail would cause harm. Verify against the original before publishing or
          printing anything consequential.
        </P>
      </Section>

      <Section id="ip" num={6} title="Intellectual property">
        <P>
          The service, meaning its code, design, text, branding and the selection of models
          offered, belongs to Pixelify or its licensors, protected by applicable
          intellectual-property law. These Terms give you a personal, non-exclusive,
          non-transferable licence to use the service for its intended purpose.
        </P>
        <P>
          The neural models, open-source libraries and fonts used by the service are provided under
          their own respective licences (including open-source licences governing ONNX Runtime,
          Transformers.js, and the individual model weights); those licences govern your use of
          them, and nothing here narrows them.
        </P>
        <P>
          Feedback you send us (bug reports, feature requests) may be used freely to improve the
          service, but as noted above, we never obtain rights to the images you process.
        </P>
      </Section>

      <Section id="disclaimers" num={7} title="Disclaimers">
        <Callout title="The service is provided as-is">
          <p>
            To the maximum extent permitted by law, Pixelify is provided "as is" and "as available",
            without warranties of any kind, whether express, implied or statutory, including
            implied warranties of merchantability, fitness for a particular purpose,
            non-infringement, accuracy and uninterrupted availability. We do not warrant that any
            output will meet
            your requirements, that results will be error-free, or that the service will be secure
            or available at all times.
          </p>
        </Callout>
        <P>
          You use the service and rely on its outputs at your own discretion and risk.
        </P>
      </Section>

      <Section id="liability" num={8} title="Limitation of liability">
        <P>
          To the maximum extent permitted by applicable law, neither Pixelify nor its contributors
          will be liable for any indirect, incidental, special, consequential or punitive damages,
          or for any loss of profits, revenue, goodwill, data or business opportunity, arising from
          or related to your use of (or inability to use) the service or reliance on its outputs.
        </P>
        <P>
          Our total aggregate liability for any claim arising out of these Terms or the service
          will not exceed the greater of the amount you paid us for the service in the twelve
          months before the claim (which, since the service is free, is zero) or the equivalent
          of US$10, where a non-zero floor is required by law.
        </P>
        <P>
          Some jurisdictions do not allow certain limitations; in those places, our liability is
          limited to the fullest extent the law permits.
        </P>
      </Section>

      <Section id="changes" num={9} title="Changes & termination">
        <P>
          We may update these Terms from time to time. The current version always lives on this
          page with its date at the top; material changes will be announced on the products page
          before they take effect. Continued use of the service after changes become effective
          constitutes acceptance of them. If you do not agree, stop using the service.
        </P>
        <P>
          You may stop using Pixelify at any time: close the tab, clear your site data, and
          nothing of yours remains anywhere. We may restrict or terminate access for anyone who
          breaches these Terms, though since there are no accounts, "termination" practically means
          blocking abusive traffic.
        </P>
      </Section>

      <Section id="law" num={10} title="Governing law">
        <P>
          Pixelify is used worldwide. These Terms are interpreted under general principles of
          contract law applicable to a free, globally available web service, without regard to
          conflict-of-law rules that would force the law of any particular country. If you are a
          consumer in a jurisdiction that grants you mandatory protections, those protections apply
          to you in addition to what is written here and are not waived by these Terms.
        </P>
        <P>
          If any provision of these Terms is found unenforceable, it will be enforced to the
          maximum extent permissible and the remaining provisions will remain in full force. Our
          failure to enforce any provision is not a waiver of it.
        </P>
      </Section>

      <Section id="contact" num={11} title="Contact">
        <P>
          Questions about these Terms, or anything about how the service works, can be raised
          openly on GitHub:
        </P>
        <Callout title="Contact">
          <p>
            <a href="https://github.com/yash5800/pixelify/issues" target="_blank" rel="noreferrer">
              github.com/yash5800/pixelify/issues
            </a>
            {'. '}Open an issue and we will respond. See also the
            <a href="/privacy"> Privacy Policy</a> and the
            <a href="/products"> products overview</a>.
          </p>
        </Callout>
      </Section>
    </PageShell>
  );
}
