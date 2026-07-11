function PageShell({ eyebrow, title, subtitle, children }) {
  return (
    <main
      style={{
        minHeight: "70vh",
        padding: "110px 24px",
      }}
    >
      <section
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "70px",
          borderRadius: "28px",
          background:
            "radial-gradient(circle at top left, rgba(61, 165, 255, 0.18), transparent 35%), rgba(255, 255, 255, 0.035)",
          border: "1px solid rgba(255, 255, 255, 0.09)",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.45)",
        }}
      >
        <p className="eyebrow">{eyebrow}</p>

        <h1
          style={{
            fontSize: "58px",
            lineHeight: "1.08",
            marginBottom: "24px",
            background: "linear-gradient(180deg, #ffffff, #9d9d9d)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {title}
        </h1>

        <p
          style={{
            maxWidth: "760px",
            color: "#c8c8c8",
            fontSize: "19px",
            lineHeight: "1.8",
            marginBottom: "36px",
          }}
        >
          {subtitle}
        </p>

        {children}
      </section>
    </main>
  );
}

export default PageShell;