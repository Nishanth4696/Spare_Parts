import { createSlice, createSelector } from '@reduxjs/toolkit';

const initialState = {
  items: [], // { product, qty, lineDiscount }
  priceMode: 'retail',
  billDiscount: '0', // rupees, as typed
  paymentMode: 'cash',
  amountReceived: '', // rupees, as typed — cash tendered
  customerId: null,
  customerName: '',
  customerPhone: '',
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action) {
      const product = action.payload;
      const existing = state.items.find((l) => l.product.id === product.id);
      if (existing) {
        existing.qty += 1;
      } else {
        state.items.push({ product, qty: 1, lineDiscount: 0 });
      }
    },
    updateQty(state, action) {
      const { productId, qty } = action.payload;
      const line = state.items.find((l) => l.product.id === productId);
      if (line) line.qty = Math.max(1, qty);
    },
    removeItem(state, action) {
      state.items = state.items.filter((l) => l.product.id !== action.payload);
    },
    setLineDiscount(state, action) {
      const { productId, discount } = action.payload;
      const line = state.items.find((l) => l.product.id === productId);
      if (line) line.lineDiscount = Math.max(0, Number(discount) || 0);
    },
    setPriceMode(state, action) {
      state.priceMode = action.payload;
    },
    setBillDiscount(state, action) {
      state.billDiscount = action.payload;
    },
    setPaymentMode(state, action) {
      state.paymentMode = action.payload;
    },
    setAmountReceived(state, action) {
      state.amountReceived = action.payload;
    },
    setCustomer(state, action) {
      const { id = null, name = '', phone = '' } = action.payload || {};
      state.customerId = id;
      state.customerName = name;
      state.customerPhone = phone;
    },
    setCustomerName(state, action) {
      state.customerId = null;
      state.customerName = action.payload;
    },
    setCustomerPhone(state, action) {
      state.customerId = null;
      state.customerPhone = action.payload;
    },
    resetCart() {
      return initialState;
    },
  },
});

export const {
  addItem,
  updateQty,
  removeItem,
  setLineDiscount,
  setPriceMode,
  setBillDiscount,
  setPaymentMode,
  setAmountReceived,
  setCustomer,
  setCustomerName,
  setCustomerPhone,
  resetCart,
} = cartSlice.actions;

function lineAmounts(line, priceMode) {
  const price = priceMode === 'garage' ? line.product.garage_price : line.product.sale_price;
  const lineDiscount = line.lineDiscount || 0;
  const taxable = price * line.qty - lineDiscount;
  const gst = Math.round(taxable * (line.product.gst_rate / 100));
  return { price, taxable, gst, total: taxable + gst };
}

const selectCart = (state) => state.cart;

export const selectCartTotals = createSelector([selectCart], (cart) => {
  let subtotal = 0;
  let gstAmt = 0;
  for (const line of cart.items) {
    const { taxable, gst } = lineAmounts(line, cart.priceMode);
    subtotal += taxable;
    gstAmt += gst;
  }
  const discountPaise = Math.round(Number(cart.billDiscount || 0) * 100);
  const total = subtotal + gstAmt - discountPaise;
  return { subtotal, gstAmt, discountPaise, total };
});

export const selectCartLines = createSelector([selectCart], (cart) =>
  cart.items.map((line) => ({
    ...line,
    amounts: lineAmounts(line, cart.priceMode),
    insufficientStock: line.qty > line.product.stock,
  }))
);

export const selectCartItemCount = createSelector([selectCart], (cart) =>
  cart.items.reduce((n, l) => n + l.qty, 0)
);

export default cartSlice.reducer;
