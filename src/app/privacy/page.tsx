'use client';

import React from 'react';

export default function PrivacyPolicyPage() {
  const lastUpdated = "January 10, 2025";

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-lg text-gray-600">
          Your privacy is important to us. This policy explains how Web Tutorial AI collects, uses, and protects your information.
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
            <li><a href="#information-we-collect" className="text-blue-600 hover:underline">Information We Collect</a></li>
            <li><a href="#how-we-use-information" className="text-blue-600 hover:underline">How We Use Your Information</a></li>
            <li><a href="#ai-interactions" className="text-blue-600 hover:underline">AI Interactions and Content Processing</a></li>
            <li><a href="#data-sharing" className="text-blue-600 hover:underline">Data Sharing and Third Parties</a></li>
            <li><a href="#data-security" className="text-blue-600 hover:underline">Data Security</a></li>
            <li><a href="#usage-tracking" className="text-blue-600 hover:underline">Usage Tracking and Analytics</a></li>
            <li><a href="#user-rights" className="text-blue-600 hover:underline">Your Rights and Choices</a></li>
            <li><a href="#data-retention" className="text-blue-600 hover:underline">Data Retention</a></li>
            <li><a href="#international-transfers" className="text-blue-600 hover:underline">International Data Transfers</a></li>
            <li><a href="#children-privacy" className="text-blue-600 hover:underline">Children's Privacy</a></li>
            <li><a href="#changes-to-policy" className="text-blue-600 hover:underline">Changes to This Policy</a></li>
            <li><a href="#contact-us" className="text-blue-600 hover:underline">Contact Us</a></li>
          </ol>
        </div>

        {/* Information We Collect */}
        <section id="information-we-collect" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
          
          <h3 className="text-xl font-semibold mb-3">Account Information</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Email address (through Google Sign-In)</li>
            <li>Google profile information (name, profile picture)</li>
            <li>Unique user identifier (Firebase UID)</li>
            <li>Subscription status and trial history</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Usage Information</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Extension usage time and session data</li>
            <li>Daily usage limits and tracking</li>
            <li>Feature access attempts and permissions</li>
            <li>AI interaction frequency and patterns</li>
            <li>Browser version and extension version</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Content and Interaction Data</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Website URLs where the extension is used</li>
            <li>Webpage content that you ask the AI to analyze</li>
            <li>Your questions and prompts to the AI</li>
            <li>AI responses and generated content</li>
            <li>Custom roles and tasks you create (Premium users)</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Technical Information</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>IP address and general location</li>
            <li>Browser type and version</li>
            <li>Device information and operating system</li>
            <li>Extension performance and error logs</li>
          </ul>
        </section>

        {/* How We Use Information */}
        <section id="how-we-use-information" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
          
          <h3 className="text-xl font-semibold mb-3">Service Provision</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Provide AI assistance and webpage analysis</li>
            <li>Authenticate users and manage accounts</li>
            <li>Process subscription payments through Stripe</li>
            <li>Enforce usage limits and trial restrictions</li>
            <li>Deliver premium features to subscribers</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Improvement and Analytics</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Analyze usage patterns to improve the service</li>
            <li>Monitor system performance and reliability</li>
            <li>Develop new features and capabilities</li>
            <li>Conduct A/B testing and user research</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Security and Compliance</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Detect and prevent fraud and abuse</li>
            <li>Enforce our Terms of Service</li>
            <li>Comply with legal obligations</li>
            <li>Protect user safety and system integrity</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Communication</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Send important service updates and notifications</li>
            <li>Provide customer support</li>
            <li>Send marketing communications (with consent)</li>
          </ul>
        </section>

        {/* AI Interactions */}
        <section id="ai-interactions" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">3. AI Interactions and Content Processing</h2>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className="font-semibold">Important: We prioritize the privacy of your AI interactions.</p>
          </div>

          <h3 className="text-xl font-semibold mb-3">Content Processing</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Webpage content is processed locally in your browser when possible</li>
            <li>AI requests may be sent to third-party AI providers (OpenAI, Anthropic, Google)</li>
            <li>We use enterprise-grade AI APIs with enhanced privacy protections</li>
            <li>Your conversations are not used to train AI models</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Data Minimization</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Only necessary webpage content is sent to AI providers</li>
            <li>Personal information is filtered out before AI processing</li>
            <li>Session data is encrypted in transit and at rest</li>
            <li>AI interaction logs are anonymized for analytics</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Knowledge Base Access</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Premium features may access our curated knowledge base</li>
            <li>Knowledge base queries are logged for service improvement</li>
            <li>Your questions may be aggregated for content optimization</li>
            <li>Individual queries are not shared with third parties</li>
          </ul>
        </section>

        {/* Data Sharing */}
        <section id="data-sharing" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">4. Data Sharing and Third Parties</h2>
          
          <h3 className="text-xl font-semibold mb-3">Service Providers</h3>
          <div className="mb-4">
            <p className="mb-2">We work with trusted service providers who help us operate our service:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Google Firebase:</strong> Authentication, database, and hosting services</li>
              <li><strong>Stripe:</strong> Payment processing and subscription management</li>
              <li><strong>AI Providers:</strong> OpenAI, Anthropic, Google AI for AI capabilities</li>
              <li><strong>Vercel:</strong> Website hosting and edge computing</li>
            </ul>
          </div>

          <h3 className="text-xl font-semibold mb-3">Data Processing Agreements</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>All service providers sign data processing agreements</li>
            <li>Third parties are contractually required to protect your data</li>
            <li>We regularly audit our service providers' security practices</li>
            <li>Data sharing is limited to what's necessary for service provision</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">No Sale of Personal Data</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>We do not sell your personal information to third parties</li>
            <li>We do not share individual user data for marketing purposes</li>
            <li>Aggregated, anonymized data may be used for research and improvement</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Legal Requirements</h3>
          <p className="mb-4">
            We may disclose your information if required by law, such as in response to a court order, 
            subpoena, or other legal process, or to protect our rights and the safety of our users.
          </p>
        </section>

        {/* Data Security */}
        <section id="data-security" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">5. Data Security</h2>
          
          <h3 className="text-xl font-semibold mb-3">Technical Safeguards</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>End-to-end encryption for data transmission</li>
            <li>Encrypted storage of sensitive user data</li>
            <li>Regular security audits and penetration testing</li>
            <li>Secure API endpoints with authentication and rate limiting</li>
            <li>Multi-factor authentication for administrative access</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Access Controls</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Principle of least privilege for data access</li>
            <li>Regular access reviews and role-based permissions</li>
            <li>Secure development practices and code reviews</li>
            <li>Employee privacy training and confidentiality agreements</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Incident Response</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Comprehensive incident response plan</li>
            <li>Immediate notification procedures for data breaches</li>
            <li>Regular backup and disaster recovery testing</li>
            <li>Continuous monitoring for security threats</li>
          </ul>
        </section>

        {/* Usage Tracking */}
        <section id="usage-tracking" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">6. Usage Tracking and Analytics</h2>
          
          <h3 className="text-xl font-semibold mb-3">Anonymous Analytics</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>We collect anonymized usage statistics to improve our service</li>
            <li>Analytics data is aggregated and cannot identify individual users</li>
            <li>We track feature usage, performance metrics, and error rates</li>
            <li>No personal content or conversations are included in analytics</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Usage Limits and Monitoring</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Daily usage is tracked to enforce subscription limits</li>
            <li>Session duration and frequency are monitored</li>
            <li>Usage data is used for billing and subscription management</li>
            <li>Historical usage data helps optimize system performance</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Opt-Out Options</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>You can opt out of non-essential analytics collection</li>
            <li>Essential usage tracking for billing cannot be disabled</li>
            <li>Contact us to adjust your privacy preferences</li>
          </ul>
        </section>

        {/* User Rights */}
        <section id="user-rights" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">7. Your Rights and Choices</h2>
          
          <h3 className="text-xl font-semibold mb-3">Access and Control</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>View and download your personal data</li>
            <li>Update your account information and preferences</li>
            <li>Delete your account and associated data</li>
            <li>Export your custom roles and tasks</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Data Portability</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Request a copy of your data in a machine-readable format</li>
            <li>Export your conversation history and preferences</li>
            <li>Transfer your custom configurations to another service</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Correction and Deletion</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Correct inaccurate personal information</li>
            <li>Request deletion of specific data categories</li>
            <li>Right to be forgotten (subject to legal requirements)</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Marketing Communications</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Unsubscribe from marketing emails at any time</li>
            <li>Manage notification preferences in your account settings</li>
            <li>Essential service communications cannot be disabled</li>
          </ul>

          <div className="bg-green-50 p-4 rounded-lg mt-4">
            <p className="font-semibold">Exercise Your Rights</p>
            <p>To exercise any of these rights, contact us at privacy@webtutorialai.com or use the data management tools in your account dashboard.</p>
          </div>
        </section>

        {/* Data Retention */}
        <section id="data-retention" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">8. Data Retention</h2>
          
          <h3 className="text-xl font-semibold mb-3">Retention Periods</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li><strong>Account Data:</strong> Retained while your account is active</li>
            <li><strong>Usage Logs:</strong> 90 days for debugging and analytics</li>
            <li><strong>AI Conversations:</strong> 30 days for quality improvement</li>
            <li><strong>Payment Information:</strong> As required by law and payment processors</li>
            <li><strong>Support Tickets:</strong> 2 years for service improvement</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Automatic Deletion</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Old session data is automatically purged</li>
            <li>Inactive accounts may be deleted after 2 years</li>
            <li>Temporary processing data is deleted after use</li>
            <li>Anonymized analytics data may be retained longer</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Account Deletion</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Personal data is deleted within 30 days of account deletion</li>
            <li>Some data may be retained for legal compliance</li>
            <li>Anonymized data may be retained for analytics</li>
            <li>Backups are securely destroyed according to our schedule</li>
          </ul>
        </section>

        {/* International Transfers */}
        <section id="international-transfers" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">9. International Data Transfers</h2>
          
          <p className="mb-4">
            Web Tutorial AI operates globally and may transfer your personal information to countries 
            outside your residence. We ensure that all international transfers comply with applicable 
            data protection laws.
          </p>

          <h3 className="text-xl font-semibold mb-3">Safeguards for International Transfers</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Standard Contractual Clauses (SCCs) for EU data transfers</li>
            <li>Adequacy decisions where available</li>
            <li>Privacy Shield successor frameworks</li>
            <li>Additional safeguards for sensitive data</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Data Locations</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Primary data centers in the United States and EU</li>
            <li>AI processing may occur in provider data centers globally</li>
            <li>Backup data stored in multiple geographic regions</li>
            <li>Edge processing for improved performance and privacy</li>
          </ul>
        </section>

        {/* Children's Privacy */}
        <section id="children-privacy" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">10. Children's Privacy</h2>
          
          <p className="mb-4">
            Web Tutorial AI is not intended for children under 13 years of age. We do not knowingly 
            collect personal information from children under 13. If we learn that we have collected 
            personal information from a child under 13, we will promptly delete such information.
          </p>

          <h3 className="text-xl font-semibold mb-3">Age Verification</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Users must confirm they are at least 13 years old</li>
            <li>Google Sign-In provides additional age verification</li>
            <li>Parental consent required for users under 18 in some jurisdictions</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Educational Use</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Educational institutions may use our service with appropriate safeguards</li>
            <li>School administrators can manage student accounts</li>
            <li>Enhanced privacy protections for educational users</li>
            <li>COPPA and FERPA compliance for educational contexts</li>
          </ul>
        </section>

        {/* Changes to Policy */}
        <section id="changes-to-policy" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">11. Changes to This Policy</h2>
          
          <p className="mb-4">
            We may update this Privacy Policy from time to time to reflect changes in our practices, 
            technology, legal requirements, or other factors.
          </p>

          <h3 className="text-xl font-semibold mb-3">Notification of Changes</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>We will notify you of material changes via email</li>
            <li>Updates will be posted on our website with the effective date</li>
            <li>Continued use constitutes acceptance of updated terms</li>
            <li>Major changes may require explicit consent</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Version History</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Previous versions are archived for reference</li>
            <li>Change logs are available upon request</li>
            <li>Legal requirements for retention of policy versions</li>
          </ul>
        </section>

        {/* Contact Us */}
        <section id="contact-us" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">12. Contact Us</h2>
          
          <p className="mb-4">
            If you have questions about this Privacy Policy or our privacy practices, please contact us:
          </p>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
            <ul className="space-y-2">
              <li><strong>Email:</strong> privacy@webtutorialai.com</li>
              <li><strong>Support:</strong> support@webtutorialai.com</li>
              <li><strong>Data Protection Officer:</strong> dpo@webtutorialai.com</li>
              <li><strong>Mailing Address:</strong> [Your Company Address]</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Response Time</h3>
            <p>We aim to respond to privacy inquiries within 30 days. For urgent matters, please indicate this in your subject line.</p>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              © 2024 Web Tutorial AI. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
              <a href="/contact" className="text-blue-600 hover:underline">Contact</a>
              <a href="/dashboard" className="text-blue-600 hover:underline">Dashboard</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}