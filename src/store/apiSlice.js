import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

function withParams(path, params) {
  if (!params) return path;
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return qs ? `${path}?${qs}` : path;
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:4317/api' }),
  tagTypes: ['Product', 'Customer', 'Supplier', 'Invoice', 'Purchase', 'StockLedger', 'Report', 'Settings', 'Backup'],
  endpoints: (builder) => ({
    // Products
    getProducts: builder.query({
      query: (params) => withParams('/products', params),
      providesTags: (result) =>
        result
          ? [...result.map((p) => ({ type: 'Product', id: p.id })), { type: 'Product', id: 'LIST' }]
          : [{ type: 'Product', id: 'LIST' }],
    }),
    getProductFilters: builder.query({
      query: () => '/products/filters',
      providesTags: [{ type: 'Product', id: 'FILTERS' }],
    }),
    getProduct: builder.query({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),
    addProduct: builder.mutation({
      query: (body) => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, { type: 'Product', id: 'FILTERS' }],
    }),
    updateProduct: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/products/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
        { type: 'Product', id: 'FILTERS' },
        'StockLedger',
      ],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, { type: 'Product', id: 'FILTERS' }],
    }),
    uploadProductImage: builder.mutation({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append('image', file);
        return { url: `/products/${id}/image`, method: 'POST', body: formData };
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'Product', id }, { type: 'Product', id: 'LIST' }],
    }),

    // Customers
    getCustomers: builder.query({
      query: (params) => withParams('/customers', params),
      providesTags: (result) =>
        result
          ? [...result.map((c) => ({ type: 'Customer', id: c.id })), { type: 'Customer', id: 'LIST' }]
          : [{ type: 'Customer', id: 'LIST' }],
    }),
    addCustomer: builder.mutation({
      query: (body) => ({ url: '/customers', method: 'POST', body }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
    }),
    updateCustomer: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/customers/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Customer', id }, { type: 'Customer', id: 'LIST' }],
    }),

    // Suppliers
    getSuppliers: builder.query({
      query: (params) => withParams('/suppliers', params),
      providesTags: (result) =>
        result
          ? [...result.map((s) => ({ type: 'Supplier', id: s.id })), { type: 'Supplier', id: 'LIST' }]
          : [{ type: 'Supplier', id: 'LIST' }],
    }),
    addSupplier: builder.mutation({
      query: (body) => ({ url: '/suppliers', method: 'POST', body }),
      invalidatesTags: [{ type: 'Supplier', id: 'LIST' }],
    }),

    // Invoices
    getInvoices: builder.query({
      query: (params) => withParams('/invoices', params),
      providesTags: [{ type: 'Invoice', id: 'LIST' }],
    }),
    getInvoice: builder.query({
      query: (id) => `/invoices/${id}`,
      providesTags: (result, error, id) => [{ type: 'Invoice', id }],
    }),
    createInvoice: builder.mutation({
      query: (body) => ({ url: '/invoices', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Product', id: 'LIST' },
        { type: 'Invoice', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
        'StockLedger',
        'Report',
      ],
    }),

    // Purchases
    getPurchases: builder.query({
      query: (params) => withParams('/purchases', params),
      providesTags: [{ type: 'Purchase', id: 'LIST' }],
    }),
    createPurchase: builder.mutation({
      query: (body) => ({ url: '/purchases', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Product', id: 'LIST' },
        { type: 'Purchase', id: 'LIST' },
        { type: 'Supplier', id: 'LIST' },
        'StockLedger',
        'Report',
      ],
    }),

    // Stock ledger
    getStockLedger: builder.query({
      query: (params) => withParams('/stock-ledger', params),
      providesTags: ['StockLedger'],
    }),

    // Reports
    getDailySales: builder.query({
      query: (date) => withParams('/reports/daily-sales', { date }),
      providesTags: ['Report'],
    }),
    getSalesTrend: builder.query({
      query: (params) => withParams('/reports/sales-trend', params),
      providesTags: ['Report'],
    }),
    getPeriodSummary: builder.query({
      query: (params) => withParams('/reports/period-summary', params),
      providesTags: ['Report'],
    }),
    getBreakdown: builder.query({
      query: (params) => withParams('/reports/breakdown', params),
      providesTags: ['Report'],
    }),
    getTopProducts: builder.query({
      query: (params) => withParams('/reports/top-products', params),
      providesTags: ['Report'],
    }),
    getTopCustomers: builder.query({
      query: (params) => withParams('/reports/top-customers', params),
      providesTags: ['Report'],
    }),
    getPaymentBreakdown: builder.query({
      query: (params) => withParams('/reports/payment-breakdown', params),
      providesTags: ['Report'],
    }),
    getAccounts: builder.query({
      query: () => '/reports/accounts',
      providesTags: ['Report', 'Customer', 'Supplier'],
    }),
    getDeadStock: builder.query({
      query: (params) => withParams('/reports/dead-stock', params),
      providesTags: ['Report'],
    }),
    getStockValue: builder.query({
      query: () => '/reports/stock-value',
      providesTags: ['Report'],
    }),
    getLowStock: builder.query({
      query: () => '/reports/low-stock',
      providesTags: ['Report'],
    }),
    getMovers: builder.query({
      query: (params) => withParams('/reports/movers', params),
      providesTags: ['Report'],
    }),

    // Settings
    getSettings: builder.query({
      query: () => '/settings',
      providesTags: ['Settings'],
    }),
    updateSettings: builder.mutation({
      query: (body) => ({ url: '/settings', method: 'PUT', body }),
      invalidatesTags: ['Settings'],
    }),

    // Backup
    getBackups: builder.query({
      query: () => '/backup',
      providesTags: ['Backup'],
    }),
    runBackup: builder.mutation({
      query: () => ({ url: '/backup/run', method: 'POST' }),
      invalidatesTags: ['Backup'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductFiltersQuery,
  useGetProductQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadProductImageMutation,
  useGetCustomersQuery,
  useAddCustomerMutation,
  useUpdateCustomerMutation,
  useGetSuppliersQuery,
  useAddSupplierMutation,
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useGetPurchasesQuery,
  useCreatePurchaseMutation,
  useGetStockLedgerQuery,
  useGetDailySalesQuery,
  useGetSalesTrendQuery,
  useGetPeriodSummaryQuery,
  useGetBreakdownQuery,
  useGetTopProductsQuery,
  useGetTopCustomersQuery,
  useGetPaymentBreakdownQuery,
  useGetAccountsQuery,
  useGetDeadStockQuery,
  useGetStockValueQuery,
  useGetLowStockQuery,
  useGetMoversQuery,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetBackupsQuery,
  useRunBackupMutation,
} = apiSlice;
