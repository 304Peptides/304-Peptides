import ProductCard from "./ProductCard";
import { products } from "../data/products";

function BestSellers({ onProductSelect, isLoggedIn, onAddToCart }) {
  const bestSellerProducts = products.filter((product) => product.isBestSeller);

  return (
    <section className="best-sellers">

      <div className="section-header">
        <p className="eyebrow">FEATURED PRODUCTS</p>

        <h2>Best Sellers</h2>

        <p>
          Top quality. Clear documentation. Built around research-use standards.
        </p>
      </div>

      <div className="product-grid">

        {bestSellerProducts.map((product) => (
          <ProductCard
            key={product.name}
            product={product}
            isLoggedIn={isLoggedIn}
            onViewDetails={() => onProductSelect(product)}
            onAddToCart={() => onAddToCart(product)}
          />
        ))}

      </div>

    </section>
  );
}

export default BestSellers;