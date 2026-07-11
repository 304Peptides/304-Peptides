function Hero({ onNavigate }) {
  return (
    <section className="hero">
      <div className="hero-content">

        <p className="eyebrow">304 PEPTIDES</p>

        <h1>
          Precision. Transparency. Quality.
        </h1>

        <p>
          Research-use products built around clear documentation, professional
          standards, and customer trust.
        </p>

        <div className="hero-buttons">
          <button
            className="primary-btn"
            onClick={() => onNavigate?.("products")}
          >
            Browse Products
          </button>

          <button
            className="secondary-btn"
            onClick={() => onNavigate?.("quality")}
          >
            View Quality Standard
          </button>
        </div>

      </div>
    </section>
  );
}

export default Hero;