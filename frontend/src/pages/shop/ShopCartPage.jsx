import { Link, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Package, Store } from "lucide-react";
import { useShopCartStore, useShopCustomerStore } from "../../stores/shopStore.js";

function StoreGroup({ storeSlug, items, currencySymbol, updateQty, removeItem }) {
  const storeName = items[0]?.storeName || storeSlug;
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const gst = items.reduce((s, i) => s + (i.unitPrice * i.qty * (i.taxPercent || 0)) / 100, 0);
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Store header */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store size={15} className="text-primary-600" />
          <span className="font-semibold text-gray-800 text-sm">{storeName}</span>
          <span className="text-xs text-gray-400">({items.length} item{items.length !== 1 ? "s" : ""})</span>
        </div>
        <Link to={`/shop/store/${storeSlug}`} className="text-xs text-primary-600 hover:underline">
          Add more
        </Link>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-50">
        {items.map(item => (
          <div key={item.productId} className="flex items-start gap-3 px-5 py-4">
            <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
              {item.image
                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-gray-300" /></div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">{item.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {currencySymbol}{item.unitPrice?.toLocaleString("en-IN")}
                {item.taxPercent > 0 && ` + ${item.taxPercent}% GST`}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button onClick={() => item.qty <= 1 ? removeItem(item.productId, storeSlug) : updateQty(item.productId, storeSlug, item.qty - 1)}
                    className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors">
                    <Minus size={12} />
                  </button>
                  <span className="px-3 py-1 text-sm font-medium text-gray-900 border-x border-gray-200 min-w-[2rem] text-center">{item.qty}</span>
                  <button onClick={() => updateQty(item.productId, storeSlug, item.qty + 1)}
                    disabled={item.qty >= item.stock}
                    className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40">
                    <Plus size={12} />
                  </button>
                </div>
                <button onClick={() => removeItem(item.productId, storeSlug)}
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-gray-900">
                {currencySymbol}{(item.unitPrice * item.qty).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Store subtotal + checkout */}
      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium text-gray-900">{currencySymbol}{subtotal.toLocaleString("en-IN")}</span>
        </div>
        {gst > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
            <span>GST (approx.)</span>
            <span>+{currencySymbol}{gst.toFixed(2)}</span>
          </div>
        )}
        <button
          onClick={() => navigate(`/shop/store/${storeSlug}/checkout`)}
          className="w-full py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
          Checkout {storeName} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ShopCartPage() {
  const { items, itemsByStore, updateQty, removeItem, clearAll } = useShopCartStore();
  const { isAuthenticated } = useShopCustomerStore();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingCart size={48} className="mx-auto mb-4 text-gray-200" />
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Your cart is empty</h2>
        <p className="text-sm text-gray-400 mb-6">Browse stores and add items to get started</p>
        <Link to="/shop" className="px-6 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors">
          Browse Stores
        </Link>
      </div>
    );
  }

  const storeMap = itemsByStore();
  const totalItems = items.reduce((s, i) => s + i.qty, 0);

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900 mb-6">
          Your Cart ({totalItems} item{totalItems !== 1 ? "s" : ""})
        </h1>

        {[...storeMap.entries()].map(([slug, storeItems]) => {
          const sym = storeItems[0]?.currencySymbol || "₹";
          return (
            <StoreGroup key={slug} storeSlug={slug} items={storeItems} currencySymbol={sym}
              updateQty={updateQty} removeItem={removeItem} />
          );
        })}

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-700 mb-3">Sign in to place your orders</p>
          <button onClick={() => navigate(`/shop/login?next=/shop/cart`)}
            className="px-5 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors">
            Sign in to checkout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-gray-900">
          Your Cart <span className="text-gray-400 font-normal text-sm">({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
        </h1>
        <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-600 hover:underline">Clear all</button>
      </div>

      <div className="space-y-4">
        {[...storeMap.entries()].map(([slug, storeItems]) => {
          const sym = storeItems[0]?.currencySymbol || "₹";
          return (
            <StoreGroup key={slug} storeSlug={slug} items={storeItems} currencySymbol={sym}
              updateQty={updateQty} removeItem={removeItem} />
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Each store is checked out and paid separately
      </p>
    </div>
  );
}
