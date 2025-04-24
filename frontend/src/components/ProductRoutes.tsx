import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Products from './Products';
import ProductDetail from './ProductDetail';
import ProductForm from './ProductForm';

const ProductRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/new" element={<ProductForm mode="create" />} />
      <Route path="/edit/:id" element={<ProductForm mode="edit" />} />
      <Route path="/:id" element={<ProductDetail />} />
      <Route path="/" element={<Products />} />
    </Routes>
  );
};

export default ProductRoutes; 