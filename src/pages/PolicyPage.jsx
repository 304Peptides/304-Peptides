import {
  POLICIES,
  POLICY_EFFECTIVE_DATE,
  POLICY_NAVIGATION,
  POLICY_SUPPORT_EMAIL,
  POLICY_VERSION,
} from "../data/policies";

function PolicyPage({
  policyKey = "terms",
  onNavigate = () => {},
}) {
  const policy =
    POLICIES[policyKey] ||
    POLICIES.terms;

  return (
    <>
      <style>{policyCss}</style>

      <main className="policy-page">
        <section className="policy-inner">
          <header className="policy-hero">
            <p className="eyebrow">
              {policy.eyebrow}
            </p>

            <h1>{policy.title}</h1>

            <p className="policy-summary">
              {policy.summary}
            </p>

            <div className="policy-metadata">
              <span>
                Effective:{" "}
                <strong>
                  {POLICY_EFFECTIVE_DATE}
                </strong>
              </span>

              <span>
                Version:{" "}
                <strong>
                  {POLICY_VERSION}
                </strong>
              </span>
            </div>
          </header>

          <nav
            className="policy-navigation"
            aria-label="Website policies"
          >
            {POLICY_NAVIGATION.map(
              (navigationItem) => (
                <button
                  key={navigationItem.key}
                  type="button"
                  className={
                    navigationItem.key ===
                    policyKey
                      ? "policy-navigation-button policy-navigation-button-active"
                      : "policy-navigation-button"
                  }
                  onClick={() =>
                    onNavigate(
                      navigationItem.page
                    )
                  }
                >
                  {navigationItem.label}
                </button>
              )
            )}
          </nav>

          <div className="policy-layout">
            <article className="policy-document">
              {policy.sections.map(
                (section) => (
                  <section
                    key={section.title}
                    className="policy-section"
                  >
                    <h2>{section.title}</h2>

                    {section.paragraphs?.map(
                      (paragraph) => (
                        <p key={paragraph}>
                          {paragraph}
                        </p>
                      )
                    )}

                    {section.bullets && (
                      <ul>
                        {section.bullets.map(
                          (bullet) => (
                            <li key={bullet}>
                              {bullet}
                            </li>
                          )
                        )}
                      </ul>
                    )}
                  </section>
                )
              )}
            </article>

            <aside className="policy-sidebar">
              <div className="policy-sidebar-card">
                <p className="eyebrow">
                  IMPORTANT
                </p>

                <h2>
                  Research Use Only
                </h2>

                <p>
                  Products are not intended
                  for human consumption,
                  veterinary use, clinical
                  use, diagnosis, treatment,
                  or administration to any
                  person or animal.
                </p>
              </div>

              <div className="policy-sidebar-card">
                <p className="eyebrow">
                  POLICY QUESTIONS
                </p>

                <h2>
                  Contact Support
                </h2>

                <p>
                  Include your name, account
                  email, order number when
                  applicable, and the policy
                  section involved.
                </p>

                <a
                  className="policy-email-link"
                  href={`mailto:${POLICY_SUPPORT_EMAIL}`}
                >
                  {POLICY_SUPPORT_EMAIL}
                </a>
              </div>

              <div className="policy-sidebar-card">
                <p className="eyebrow">
                  POLICY RECORD
                </p>

                <h2>
                  Versioned Terms
                </h2>

                <p>
                  Checkout acceptance will
                  record the published policy
                  version and acceptance time
                  with the order request.
                </p>

                <strong>
                  Version {POLICY_VERSION}
                </strong>
              </div>
            </aside>
          </div>

          <footer className="policy-document-footer">
            <p>
              These published policies are
              intended to describe the actual
              practices of 304 Peptides. They
              should be reviewed whenever
              business operations, payment,
              fulfillment, data handling,
              affiliate rules, or applicable
              requirements change.
            </p>

            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                onNavigate("contact")
              }
            >
              Contact Support
            </button>
          </footer>
        </section>
      </main>
    </>
  );
}

const policyCss = `
  .policy-page {
    min-height: 100vh;
    padding: 86px 28px 110px;
  }

  .policy-inner {
    width: min(1240px, 100%);
    margin: 0 auto;
  }

  .policy-hero {
    position: relative;
    overflow: hidden;
    padding: clamp(34px, 6vw, 66px);
    border: 1px solid rgba(97, 180, 255, 0.2);
    border-radius: 30px;
    background:
      radial-gradient(
        circle at top right,
        rgba(45, 151, 255, 0.2),
        transparent 42%
      ),
      rgba(255, 255, 255, 0.035);
    box-shadow: 0 28px 80px rgba(0, 0, 0, 0.34);
  }

  .policy-hero h1 {
    max-width: 900px;
    margin: 10px 0 18px;
    color: #ffffff;
    font-size: clamp(38px, 7vw, 70px);
    line-height: 1.03;
  }

  .policy-summary {
    max-width: 850px;
    margin: 0;
    color: #c9d4e0;
    font-size: clamp(16px, 2vw, 19px);
    line-height: 1.8;
  }

  .policy-metadata {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 28px;
  }

  .policy-metadata span {
    padding: 10px 14px;
    border: 1px solid rgba(85, 174, 255, 0.24);
    border-radius: 999px;
    background: rgba(22, 104, 180, 0.12);
    color: #cfe8ff;
    font-size: 14px;
  }

  .policy-navigation {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 24px 0;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.025);
  }

  .policy-navigation-button {
    min-height: 42px;
    padding: 10px 15px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.035);
    color: #d7e0e9;
    font: inherit;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
  }

  .policy-navigation-button:hover,
  .policy-navigation-button-active {
    border-color: rgba(56, 164, 255, 0.76);
    background: rgba(24, 129, 222, 0.18);
    color: #ffffff;
  }

  .policy-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 24px;
    align-items: start;
  }

  .policy-document {
    display: grid;
    gap: 16px;
  }

  .policy-section {
    padding: clamp(24px, 4vw, 38px);
    border: 1px solid rgba(255, 255, 255, 0.085);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.03);
    box-shadow: 0 20px 55px rgba(0, 0, 0, 0.22);
  }

  .policy-section h2 {
    margin: 0 0 16px;
    color: #ffffff;
    font-size: clamp(21px, 3vw, 29px);
    line-height: 1.2;
  }

  .policy-section p,
  .policy-section li {
    color: #c5cfda;
    font-size: 16px;
    line-height: 1.78;
  }

  .policy-section p {
    margin: 0 0 14px;
  }

  .policy-section p:last-child {
    margin-bottom: 0;
  }

  .policy-section ul {
    display: grid;
    gap: 11px;
    margin: 0;
    padding-left: 22px;
  }

  .policy-section li::marker {
    color: #45aaff;
  }

  .policy-sidebar {
    position: sticky;
    top: 96px;
    display: grid;
    gap: 16px;
  }

  .policy-sidebar-card {
    padding: 24px;
    border: 1px solid rgba(83, 173, 255, 0.18);
    border-radius: 22px;
    background:
      linear-gradient(
        145deg,
        rgba(39, 127, 207, 0.1),
        rgba(255, 255, 255, 0.025)
      );
  }

  .policy-sidebar-card h2 {
    margin: 8px 0 12px;
    color: #ffffff;
    font-size: 21px;
  }

  .policy-sidebar-card p {
    margin: 0 0 14px;
    color: #bdc9d5;
    line-height: 1.65;
  }

  .policy-sidebar-card strong {
    color: #dff1ff;
  }

  .policy-email-link {
    color: #58b4ff;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .policy-document-footer {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: center;
    margin-top: 24px;
    padding: 26px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.025);
  }

  .policy-document-footer p {
    max-width: 850px;
    margin: 0;
    color: #bfcad5;
    line-height: 1.65;
  }

  @media (max-width: 930px) {
    .policy-layout {
      grid-template-columns: 1fr;
    }

    .policy-sidebar {
      position: static;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .policy-page {
      padding: 72px 16px 90px;
    }

    .policy-navigation {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .policy-navigation-button {
      width: 100%;
    }

    .policy-sidebar {
      grid-template-columns: 1fr;
    }

    .policy-document-footer {
      align-items: stretch;
      flex-direction: column;
    }

    .policy-document-footer button {
      width: 100%;
    }
  }

  @media (max-width: 460px) {
    .policy-navigation {
      grid-template-columns: 1fr;
    }
  }
`;

export default PolicyPage;