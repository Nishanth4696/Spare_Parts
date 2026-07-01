import { useState } from 'react';
import { X, Camera } from 'lucide-react';
import { paiseToRupees, rupeesToPaise } from '../lib/money.js';
import { useAddProductMutation, useUpdateProductMutation, useUploadProductImageMutation } from '../store/apiSlice.js';
import ProductImage from './ProductImage.jsx';

const BRANDS = ['Honda', 'Hero', 'TVS'];

function toFormState(product) {
  return {
    part_no: product?.part_no || '',
    name: product?.name || '',
    brand: product?.brand || BRANDS[0],
    category: product?.category || '',
    hsn: product?.hsn || '',
    gst_rate: product?.gst_rate ?? 18,
    cost_price: product ? paiseToRupees(product.cost_price) : '0',
    sale_price: product ? paiseToRupees(product.sale_price) : '0',
    mrp: product ? paiseToRupees(product.mrp) : '0',
    garage_price: product ? paiseToRupees(product.garage_price) : '0',
    stock: product?.stock ?? 0,
    min_stock: product?.min_stock ?? 0,
    rack_location: product?.rack_location || '',
    barcode: product?.barcode || '',
  };
}

export default function ProductForm({ product, onClose, onSaved }) {
  const [form, setForm] = useState(toFormState(product));
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);

  const [addProduct, { isLoading: adding }] = useAddProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
  const [uploadImage, { isLoading: uploading }] = useUploadProductImageMutation();
  const saving = adding || updating || uploading;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const payload = {
      ...form,
      gst_rate: Number(form.gst_rate),
      cost_price: rupeesToPaise(form.cost_price),
      sale_price: rupeesToPaise(form.sale_price),
      mrp: rupeesToPaise(form.mrp),
      garage_price: rupeesToPaise(form.garage_price),
      stock: Number(form.stock),
      min_stock: Number(form.min_stock),
    };
    try {
      let saved = product
        ? await updateProduct({ id: product.id, ...payload }).unwrap()
        : await addProduct(payload).unwrap();

      if (imageFile) {
        saved = await uploadImage({ id: saved.id, file: imageFile }).unwrap();
      }
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err?.data?.error || err.message || 'Failed to save product');
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-30 p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-auto shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-heading font-semibold text-slate-800">
            {product ? 'Edit product' : 'Add product'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-5">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
            ) : (
              <ProductImage product={product} size="lg" />
            )}
            <label className="inline-flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2.5 cursor-pointer hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors duration-150">
              <Camera size={16} />
              {product?.image_path || imagePreview ? 'Change photo' : 'Add photo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Part No" id="part_no" required>
              <input id="part_no" required value={form.part_no} onChange={(e) => set('part_no', e.target.value)} className="input" />
            </Field>
            <Field label="Name" id="name" required>
              <input id="name" required value={form.name} onChange={(e) => set('name', e.target.value)} className="input" />
            </Field>
            <Field label="Brand" id="brand">
              <select id="brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} className="input cursor-pointer">
                {BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Category" id="category">
              <input id="category" value={form.category} onChange={(e) => set('category', e.target.value)} className="input" placeholder="brake, clutch, filter…" />
            </Field>
            <Field label="HSN" id="hsn">
              <input id="hsn" value={form.hsn} onChange={(e) => set('hsn', e.target.value)} className="input" />
            </Field>
            <Field label="GST %" id="gst_rate">
              <input id="gst_rate" type="number" value={form.gst_rate} onChange={(e) => set('gst_rate', e.target.value)} className="input" />
            </Field>
            <Field label="Cost price (₹)" id="cost_price">
              <input id="cost_price" type="number" step="0.01" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} className="input" />
            </Field>
            <Field label="Sale price (₹)" id="sale_price">
              <input id="sale_price" type="number" step="0.01" value={form.sale_price} onChange={(e) => set('sale_price', e.target.value)} className="input" />
            </Field>
            <Field label="MRP (₹)" id="mrp">
              <input id="mrp" type="number" step="0.01" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} className="input" />
            </Field>
            <Field label="Garage price (₹)" id="garage_price">
              <input id="garage_price" type="number" step="0.01" value={form.garage_price} onChange={(e) => set('garage_price', e.target.value)} className="input" />
            </Field>
            <Field label="Stock" id="stock">
              <input id="stock" type="number" value={form.stock} onChange={(e) => set('stock', e.target.value)} className="input" />
            </Field>
            <Field label="Min stock" id="min_stock">
              <input id="min_stock" type="number" value={form.min_stock} onChange={(e) => set('min_stock', e.target.value)} className="input" />
            </Field>
            <Field label="Rack location" id="rack_location">
              <input id="rack_location" value={form.rack_location} onChange={(e) => set('rack_location', e.target.value)} className="input" />
            </Field>
            <Field label="Barcode" id="barcode">
              <input id="barcode" value={form.barcode} onChange={(e) => set('barcode', e.target.value)} className="input" />
            </Field>
          </div>

          {error && (
            <div className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer hover:bg-slate-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold cursor-pointer transition-colors duration-150"
            >
              {saving ? 'Saving…' : 'Save product'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, id, required, children }) {
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="block font-medium text-slate-600 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
