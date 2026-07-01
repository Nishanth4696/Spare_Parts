import { Disc, Cog, Wind, Zap, Package } from 'lucide-react';

const IMAGE_BASE = 'http://localhost:4317/images';

const CATEGORY_STYLE = {
  brake: { icon: Disc, bg: 'bg-rose-50', fg: 'text-rose-500' },
  clutch: { icon: Cog, bg: 'bg-violet-50', fg: 'text-violet-500' },
  filter: { icon: Wind, bg: 'bg-teal-50', fg: 'text-teal-500' },
  drivetrain: { icon: Cog, bg: 'bg-amber-50', fg: 'text-amber-600' },
  electrical: { icon: Zap, bg: 'bg-sky-50', fg: 'text-sky-500' },
};

function placeholderStyle(category) {
  return CATEGORY_STYLE[category?.toLowerCase()] || { icon: Package, bg: 'bg-slate-100', fg: 'text-slate-400' };
}

export default function ProductImage({ product, size = 'md', className = '' }) {
  const dims = size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-24 h-24' : 'w-12 h-12';
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 40 : 22;

  if (product?.image_path) {
    return (
      <img
        src={`${IMAGE_BASE}/${product.image_path}`}
        alt={product.name}
        className={`${dims} object-cover rounded-md border border-slate-200 shrink-0 ${className}`}
      />
    );
  }

  const { icon: Icon, bg, fg } = placeholderStyle(product?.category);
  return (
    <div
      className={`${dims} ${bg} rounded-md border border-slate-200 flex items-center justify-center shrink-0 ${className}`}
      aria-label={`No photo yet for ${product?.name || 'product'}`}
    >
      <Icon size={iconSize} className={fg} strokeWidth={1.75} />
    </div>
  );
}
