import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LegalPage() {
  const { user } = useAuth()
  const updated = 'June 18, 2026'

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center gap-2">
          {user && (
            <Link
              to="/dashboard"
              className="text-sm text-green-700 hover:underline"
            >
              &larr; Back to Dashboard
            </Link>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Legal Disclaimers</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated: {updated}</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Personal Use Only</h2>
            <p>
              Family Meal Planner was created for personal and household use by a private individual.
              It is not a commercial product, a professionally managed service, or an application
              operated by a registered business entity. Use of this application is voluntary and
              entirely at your own discretion.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Not Medical or Nutritional Advice</h2>
            <p className="mb-2">
              The creator of this application is <strong>not a licensed medical professional,
              registered dietitian, certified nutritionist, or healthcare provider</strong> of any kind.
            </p>
            <p className="mb-2">
              Nothing on this platform — including but not limited to meal suggestions, nutritional
              data, calorie estimates, macro targets, allergen flags, ingredient substitutions, or
              dietary notes — constitutes medical advice, nutritional counseling, or a treatment plan
              of any kind.
            </p>
            <p>
              You should always consult a qualified healthcare professional or registered dietitian
              before making significant changes to your diet, especially if you have a medical
              condition, food allergy, eating disorder, pregnancy, or other health concern.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Allergen &amp; Dietary Information</h2>
            <p className="mb-2">
              This application includes allergen-flagging and dietary filtering features as a
              <strong> convenience aid only</strong>. These features are not guaranteed to be
              complete, accurate, or up to date. Ingredient databases, allergen classifications,
              and substitution suggestions may contain errors, omissions, or outdated information.
            </p>
            <p className="mb-2">
              <strong>Do not rely on this application as your sole safeguard against allergen
              exposure.</strong> Always verify ingredients independently, read product labels, and
              consult with a medical professional if you or a family member has a known food allergy,
              intolerance, or severe dietary restriction.
            </p>
            <p>
              The creator accepts no liability for any allergic reaction, adverse health event, or
              dietary harm arising from the use of allergen or dietary information provided by this
              application.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Nutritional Data Accuracy</h2>
            <p>
              Calorie counts, macro breakdowns (protein, carbohydrates, fat), and other nutritional
              figures displayed in this application are estimates derived from general reference
              databases. Actual nutritional content varies based on specific brands, preparation
              methods, portion sizes, and ingredient substitutions. These figures should not be used
              for medically supervised diets, clinical weight management programs, or any purpose
              requiring precise nutritional data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Food Safety &amp; Meal Vault</h2>
            <p className="mb-2">
              The Meal Vault feature tracks prepped and stored food with suggested expiration dates
              based on a general shelf-life reference table. These expiration suggestions are
              <strong> estimates only</strong> and do not account for actual storage conditions,
              preparation hygiene, temperature fluctuations, or the specific characteristics of
              individual ingredients or batches.
            </p>
            <p>
              Always use your own judgment when assessing whether stored food is safe to consume.
              When in doubt, discard the food. The creator accepts no responsibility for foodborne
              illness, spoilage-related harm, or any other food safety incident arising from reliance
              on expiration dates or shelf-life estimates provided by this application.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Limitation of Liability</h2>
            <p className="mb-2">
              To the fullest extent permitted by applicable law, the creator of Family Meal Planner
              expressly disclaims all liability for any direct, indirect, incidental, special,
              consequential, or punitive damages arising out of or in connection with your use of —
              or inability to use — this application, including but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Health complications, allergic reactions, or dietary harm</li>
              <li>Food safety incidents or foodborne illness</li>
              <li>Loss of data, including meal plans, grocery lists, or vault entries</li>
              <li>Service interruptions, downtime, or application errors</li>
              <li>Decisions made in reliance on nutritional, allergen, or shelf-life information</li>
            </ul>
            <p className="mt-2">
              Your use of this application is entirely at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. No Warranty</h2>
            <p>
              This application is provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as
              available&quot;</strong> without warranty of any kind, express or implied, including
              but not limited to warranties of merchantability, fitness for a particular purpose,
              accuracy, reliability, or non-infringement. The creator does not guarantee that the
              application will be error-free, uninterrupted, secure, or free of harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Data &amp; Privacy</h2>
            <p className="mb-2">
              Family Meal Planner stores user-provided data (meal plans, family group information,
              preferences, weight entries, and vault entries) to provide its core functionality.
              This data is stored on third-party hosting infrastructure and is not sold or shared
              with any third party for commercial purposes.
            </p>
            <p>
              However, the creator makes no guarantees regarding the security, confidentiality, or
              long-term retention of your data. Do not store sensitive personal or medical
              information beyond what is necessary for meal planning purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. Changes to This Disclaimer</h2>
            <p>
              This disclaimer may be updated at any time without prior notice. Continued use of the
              application following any update constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">10. Contact</h2>
            <p>
              If you have questions about these disclaimers, you may contact the creator at{' '}
              <a
                href="mailto:t7it3v3zk@mozmail.com"
                className="text-green-700 hover:underline"
              >
                t7it3v3zk@mozmail.com
              </a>
              .
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
