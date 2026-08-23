import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs = ({ items }: BreadcrumbsProps) => (
  <nav className="flex" aria-label="Breadcrumb">
    <ol className="flex items-center space-x-2 space-x-reverse">
      {items.map((item, index) => (
        <li key={index} className="flex items-center">
          {index > 0 && <ChevronRight size={16} className="text-gray-400 mx-2 rotate-180" />}
          {item.href ? (
            <a href={item.href} className="text-sm font-medium text-gray-500 hover:text-gray-700">
              {item.label}
            </a>
          ) : (
            <span className="text-sm font-medium text-gray-900">{item.label}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

export default Breadcrumbs;
