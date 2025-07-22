'use client';

import React from 'react';

export default function TermsOfServicePage() {
  const lastUpdated = "January 10, 2025";

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-lg text-gray-600">
          These terms govern your use of Web Tutorial AI and outline your rights and responsibilities as a user.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Last updated: {lastUpdated}
        </p>
      </div>

      <div className="prose prose-lg max-w-none">
        {/* Table of Contents */}
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Table of Contents</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li><a href="#acceptance-of-terms" className="text-blue-600 hover:underline">Acceptance of Terms</a></li>
            <li><a href="#description-of-service" className="text-blue-600 hover:underline">Description of Service</a></li>
            <li><a href="#user-accounts" className="text-blue-600 hover:underline">User Accounts and Registration</a></li>
            <li><a href="#subscription-and-billing" className="text-blue-600 hover:underline">Subscription and Billing</a></li>
            <li><a href="#acceptable-use" className="text-blue-600 hover:underline">Acceptable Use Policy</a></li>
            <li><a href="#intellectual-property" className="text-blue-600 hover:underline">Intellectual Property Rights</a></li>
            <li><a href="#ai-content-generation" className="text-blue-600 hover:underline">AI Content Generation</a></li>
            <li><a href="#privacy-and-data" className="text-blue-600 hover:underline">Privacy and Data Protection</a></li>
            <li><a href="#disclaimers" className="text-blue-600 hover:underline">Disclaimers and Limitations</a></li>
            <li><a href="#termination" className="text-blue-600 hover:underline">Termination</a></li>
            <li><a href="#dispute-resolution" className="text-blue-600 hover:underline">Dispute Resolution</a></li>
            <li><a href="#changes-to-terms" className="text-blue-600 hover:underline">Changes to Terms</a></li>
            <li><a href="#contact-information" className="text-blue-600 hover:underline">Contact Information</a></li>
          </ol>
        </div>

        {/* Acceptance of Terms */}
        <section id="acceptance-of-terms" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By downloading, installing, or using Web Tutorial AI (the "Service"), you agree to be bound by these Terms of Service ("Terms"). 
            If you do not agree to these Terms, do not use the Service.
          </p>
          
          <h3 className="text-xl font-semibold mb-3">Binding Agreement</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>These Terms constitute a legally binding agreement between you and Web Tutorial AI</li>
            <li>You must be at least 13 years old to use the Service</li>
            <li>If you are under 18, you must have parental or guardian consent</li>
            <li>You must have the legal capacity to enter into this agreement</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Additional Terms</h3>
          <p className="mb-4">
            Additional terms may apply to specific features or services. These supplemental terms are incorporated by reference and 
            form part of these Terms.
          </p>
        </section>

        {/* Description of Service */}
        <section id="description-of-service" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
          
          <h3 className="text-xl font-semibold mb-3">Core Functionality</h3>
          <p className="mb-4">
            Web Tutorial AI is a browser extension and web application that provides AI-powered assistance for web browsing, 
            content analysis, and task automation. The Service includes:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>AI-powered webpage content analysis and explanation</li>
            <li>Interactive AI assistant for questions and tasks</li>
            <li>Customizable AI roles and workflows</li>
            <li>Knowledge base access and search capabilities</li>
            <li>Usage tracking and subscription management</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Service Tiers</h3>
          <div className="mb-4">
            <p className="mb-2">The Service is offered in multiple tiers:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Anonymous:</strong> Limited 30-minute trial access</li>
              <li><strong>Trial:</strong> 7-day unlimited access to most features</li>
              <li><strong>Limited:</strong> 1-hour daily usage with basic features</li>
              <li><strong>Premium:</strong> Unlimited access to all features and customization</li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold mb-3">Service Availability</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>We strive for 99.9% uptime but cannot guarantee uninterrupted service</li>
            <li>Scheduled maintenance windows will be communicated in advance</li>
            <li>Emergency maintenance may occur without prior notice</li>
            <li>Service availability may vary by geographic region</li>
          </ul>
        </section>

        {/* User Accounts */}
        <section id="user-accounts" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">3. User Accounts and Registration</h2>
          
          <h3 className="text-xl font-semibold mb-3">Account Creation</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>You must provide accurate and complete registration information</li>
            <li>You are responsible for maintaining the confidentiality of your account</li>
            <li>You must notify us immediately of any unauthorized account access</li>
            <li>One account per person; creating multiple accounts is prohibited</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Account Security</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Use strong, unique passwords for your account</li>
            <li>Enable two-factor authentication when available</li>
            <li>Do not share your account credentials with others</li>
            <li>Log out of shared or public devices</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Account Responsibilities</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>You are responsible for all activities under your account</li>
            <li>Keep your contact information current and accurate</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Report any bugs or security vulnerabilities responsibly</li>
          </ul>
        </section>

        {/* Subscription and Billing */}
        <section id="subscription-and-billing" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">4. Subscription and Billing</h2>
          
          <h3 className="text-xl font-semibold mb-3">Subscription Plans</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Premium subscriptions are billed monthly at $5.00/month</li>
            <li>Free trial periods are limited to 7 days per email address</li>
            <li>Subscription fees are non-refundable except as required by law</li>
            <li>Prices are subject to change with 30 days' notice</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Payment Processing</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Payments are processed securely through Stripe</li>
            <li>You authorize automatic recurring charges</li>
            <li>Payment method must remain valid throughout subscription</li>
            <li>Failed payments may result in service suspension</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Cancellation and Refunds</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Cancel your subscription at any time through your account dashboard</li>
            <li>Cancellation takes effect at the end of the current billing period</li>
            <li>No partial refunds for unused portions of billing periods</li>
            <li>Refunds may be provided at our discretion for service issues</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Usage Limits</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Usage limits are enforced based on your subscription tier</li>
            <li>Attempts to circumvent usage limits may result in account suspension</li>
            <li>Usage data is tracked for billing and service optimization</li>
            <li>Excessive usage may be subject to fair use policies</li>
          </ul>
        </section>

        {/* Acceptable Use */}
        <section id="acceptable-use" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">5. Acceptable Use Policy</h2>
          
          <div className="bg-red-50 p-4 rounded-lg mb-4">
            <p className="font-semibold">Important: Violation of these policies may result in immediate account termination.</p>
          </div>

          <h3 className="text-xl font-semibold mb-3">Prohibited Uses</h3>
          <p className="mb-2">You may not use the Service to:</p>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Generate illegal, harmful, or malicious content</li>
            <li>Harass, threaten, or harm others</li>
            <li>Violate intellectual property rights</li>
            <li>Distribute spam, malware, or phishing content</li>
            <li>Attempt to gain unauthorized access to systems</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Create false or misleading information</li>
            <li>Engage in any illegal activities</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Content Guidelines</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Do not input personal information of others without consent</li>
            <li>Respect privacy and confidentiality</li>
            <li>Do not attempt to generate harmful or offensive content</li>
            <li>Follow applicable content moderation policies</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Technical Restrictions</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Do not reverse engineer or attempt to extract source code</li>
            <li>Do not use automated tools to access the Service excessively</li>
            <li>Do not attempt to bypass security measures or usage limits</li>
            <li>Respect rate limits and API usage guidelines</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Reporting Violations</h3>
          <p className="mb-4">
            Report violations of these policies to abuse@webtutorialai.com. We investigate all reports and 
            may take action including warnings, account suspension, or termination.
          </p>
        </section>

        {/* Intellectual Property */}
        <section id="intellectual-property" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">6. Intellectual Property Rights</h2>
          
          <h3 className="text-xl font-semibold mb-3">Our Intellectual Property</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>The Service, including software, design, and content, is our property</li>
            <li>Trademarks, logos, and brand names are protected intellectual property</li>
            <li>You may not copy, modify, or distribute our proprietary materials</li>
            <li>Limited license granted solely for authorized use of the Service</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Your Content</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>You retain ownership of content you input into the Service</li>
            <li>You grant us license to process your content to provide the Service</li>
            <li>We do not claim ownership of your conversations or data</li>
            <li>You are responsible for ensuring you have rights to content you input</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">AI-Generated Content</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>AI responses are generated based on your inputs and training data</li>
            <li>You may use AI-generated content subject to these Terms</li>
            <li>AI content may not be original and could be similar to other outputs</li>
            <li>Verify AI content accuracy and appropriateness before use</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Third-Party Content</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Respect third-party intellectual property when using the Service</li>
            <li>We are not responsible for third-party content or rights violations</li>
            <li>Report suspected copyright infringement to dmca@webtutorialai.com</li>
          </ul>
        </section>

        {/* AI Content Generation */}
        <section id="ai-content-generation" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">7. AI Content Generation</h2>
          
          <h3 className="text-xl font-semibold mb-3">Nature of AI Responses</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>AI responses are generated by machine learning models, not human experts</li>
            <li>Responses may contain errors, inaccuracies, or biases</li>
            <li>AI may produce different responses to similar inputs</li>
            <li>Content quality may vary based on input quality and context</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Accuracy and Reliability</h3>
          <div className="bg-yellow-50 p-4 rounded-lg mb-4">
            <p className="font-semibold">Important Disclaimer:</p>
            <p>AI-generated content should be verified for accuracy and appropriateness. Do not rely solely on AI responses for critical decisions.</p>
          </div>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>We do not guarantee the accuracy of AI-generated content</li>
            <li>Verify important information through authoritative sources</li>
            <li>Use professional judgment when applying AI suggestions</li>
            <li>Be aware that AI responses reflect training data biases</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Responsible Use</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Review AI content before sharing or publishing</li>
            <li>Ensure AI-generated content complies with applicable laws</li>
            <li>Do not present AI content as human-created without disclosure</li>
            <li>Consider the impact of AI content on others</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Limitations</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>AI cannot provide professional advice (legal, medical, financial)</li>
            <li>AI knowledge may be outdated or incomplete</li>
            <li>AI cannot access real-time information unless explicitly provided</li>
            <li>AI responses are not substitutes for professional consultation</li>
          </ul>
        </section>

        {/* Privacy and Data */}
        <section id="privacy-and-data" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">8. Privacy and Data Protection</h2>
          
          <p className="mb-4">
            Your privacy is important to us. Our <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a> 
            describes how we collect, use, and protect your information.
          </p>

          <h3 className="text-xl font-semibold mb-3">Data Collection</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>We collect information necessary to provide and improve the Service</li>
            <li>Usage data helps us optimize performance and features</li>
            <li>Personal information is protected according to our Privacy Policy</li>
            <li>You can control certain data collection through account settings</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Data Security</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>We implement industry-standard security measures</li>
            <li>Data is encrypted in transit and at rest</li>
            <li>Access to personal data is strictly controlled</li>
            <li>Security incidents are promptly investigated and reported</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Your Data Rights</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Access, correct, or delete your personal information</li>
            <li>Export your data in a portable format</li>
            <li>Control how your data is used for analytics</li>
            <li>Contact us to exercise your data rights</li>
          </ul>
        </section>

        {/* Disclaimers */}
        <section id="disclaimers" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">9. Disclaimers and Limitations</h2>
          
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <p className="font-semibold uppercase">Disclaimer of Warranties</p>
            <p className="mt-2">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, 
              EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-3">Service Limitations</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>The Service may experience downtime, errors, or performance issues</li>
            <li>AI responses are not guaranteed to be accurate or appropriate</li>
            <li>Features may be modified, suspended, or discontinued</li>
            <li>Third-party integrations may affect Service functionality</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Limitation of Liability</h3>
          <p className="mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR USE.
          </p>

          <h3 className="text-xl font-semibold mb-3">Indemnification</h3>
          <p className="mb-4">
            You agree to indemnify and hold us harmless from any claims, losses, or damages arising from 
            your use of the Service or violation of these Terms.
          </p>
        </section>

        {/* Termination */}
        <section id="termination" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">10. Termination</h2>
          
          <h3 className="text-xl font-semibold mb-3">Termination by You</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>You may terminate your account at any time through account settings</li>
            <li>Cancellation takes effect at the end of the current billing period</li>
            <li>You remain responsible for charges incurred before termination</li>
            <li>Some data may be retained as described in our Privacy Policy</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Termination by Us</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>We may suspend or terminate accounts for Terms violations</li>
            <li>Termination may be immediate for serious violations</li>
            <li>We may discontinue the Service with reasonable notice</li>
            <li>Refunds are not provided for terminated accounts except as required by law</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Effect of Termination</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Access to the Service will be immediately revoked</li>
            <li>Data deletion will occur according to our retention policies</li>
            <li>Outstanding obligations survive termination</li>
            <li>These Terms remain binding for surviving provisions</li>
          </ul>
        </section>

        {/* Dispute Resolution */}
        <section id="dispute-resolution" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">11. Dispute Resolution</h2>
          
          <h3 className="text-xl font-semibold mb-3">Informal Resolution</h3>
          <p className="mb-4">
            Before initiating formal proceedings, please contact us to resolve disputes informally. 
            Most concerns can be addressed through direct communication.
          </p>

          <h3 className="text-xl font-semibold mb-3">Governing Law</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>These Terms are governed by the laws of [Your Jurisdiction]</li>
            <li>Disputes will be resolved in the courts of [Your Jurisdiction]</li>
            <li>You consent to the jurisdiction of these courts</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Arbitration</h3>
          <p className="mb-4">
            For eligible disputes, arbitration may be required instead of court proceedings. 
            Arbitration will be conducted under the rules of [Arbitration Organization].
          </p>

          <h3 className="text-xl font-semibold mb-3">Class Action Waiver</h3>
          <p className="mb-4">
            You agree to resolve disputes individually and waive any right to participate in 
            class action lawsuits or representative proceedings.
          </p>
        </section>

        {/* Changes to Terms */}
        <section id="changes-to-terms" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">12. Changes to Terms</h2>
          
          <h3 className="text-xl font-semibold mb-3">Modification Rights</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>We may update these Terms to reflect changes in law or our Service</li>
            <li>Material changes will be communicated via email or Service notification</li>
            <li>Continued use after changes constitutes acceptance</li>
            <li>You may terminate your account if you disagree with changes</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Notice Period</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>30 days' notice for material changes affecting user rights</li>
            <li>Immediate effect for legal compliance or security updates</li>
            <li>Updated Terms will be posted with effective date</li>
          </ul>
        </section>

        {/* Contact Information */}
        <section id="contact-information" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">13. Contact Information</h2>
          
          <p className="mb-4">
            For questions about these Terms or the Service, please contact us:
          </p>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Contact Details</h3>
            <ul className="space-y-2">
              <li><strong>Email:</strong> legal@webtutorialai.com</li>
              <li><strong>Support:</strong> support@webtutorialai.com</li>
              <li><strong>Abuse Reports:</strong> abuse@webtutorialai.com</li>
              <li><strong>DMCA Notices:</strong> dmca@webtutorialai.com</li>
              <li><strong>Mailing Address:</strong> [Your Company Address]</li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              © 2024 Web Tutorial AI. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
              <a href="/contact" className="text-blue-600 hover:underline">Contact</a>
              <a href="/dashboard" className="text-blue-600 hover:underline">Dashboard</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}