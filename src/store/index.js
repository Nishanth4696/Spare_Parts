import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './apiSlice.js';
import cartReducer from './cartSlice.js';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
});
