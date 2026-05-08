import { Link, useOutletContext, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from "lucide-react";
import { useCartStore } from "../../stores/storefrontStore.js";
import { useCustomerStore } from "../../stores/storefrontStore.js";

export default function CartPage() {
  const { store, slug } = useOutletContext();
  const nav = useNavigate();
  const { items, updateQty, removeItem, clearCart } = useCartStore();
  const { isAuthenticated } = useCustomerStore();
  const currencySymbol = store?.currencySymbol || "₹";

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const taxTotal = items.reduce((s, i) => s + (i.unitPrice * i.qty * (i.taxPercent / 100)), 0);

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingCart size={48} className="mx-auto mb-4 text-gray-200" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Your cart is empty</h2>
        <p className="text-gray-400 text-sm mb-6">Browse our products and add items to your cart</p>
        <Link to={`/store/${slug}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Shopping Cart</h1>
        <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 transition-colors">
          Clear all
        </button>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.productId} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4">
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 text-sm truncate">{item.name}</h3>
              <p className="text-sm text-primary-600 font-semibold mt-0.5">
                {currencySymbol}{(item.unitPrice * item.qty).toLocaleString("en-IN")}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => updateQty(item.productId, item.qty - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  <Minus size={12} />
                </button>
                <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                <button onClick={() => updateQty(item.productId, item.qty + 1)}
                  disabled={item.qty >= item.stock}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  <Plus size={12} />
                </button>
                <span className="text-[11px] text-gray-400 ml-1">{currencySymbol}{item.unitPrice}/unit</span>
              </div>
            </div>
            <button onClick={() => removeItem(item.productId)}
              className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
        <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} items)</span>
          <span>{currencySymbol}{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {taxTotal > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>GST</span>
            <span>{currencySymbol}{taxTotal.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-gray-900">
          <span>Total (excl. delivery)</span>
          <span>{currencySymbol}{(subtotal + taxTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <button
        onClick={() => nav(isAuthenticated ? `/store/${slug}/checkout` : `/store/${slug}/login?next=/store/${slug}/checkout`)}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
      >
        {isAuthenticated ? "Proceed to Checkout" : "Sign in to Checkout"}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
