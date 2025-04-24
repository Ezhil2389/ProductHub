import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DollarSign, ArrowLeft, Plus, Minus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { productService, ProductInput, Product } from '../services/productService';

interface ProductFormProps {
  mode: 'create' | 'edit';
}

const ProductForm: React.FC<ProductFormProps> = ({ mode }) => {
  const { isDarkMode } = useTheme();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [productInput, setProductInput] = useState<ProductInput>({
    name: '',
    description: '',
    price: 0,
    quantity: 0
  });

  const [lockInfo, setLockInfo] = useState<{ editingBy: string | null; editingSince: string | null } | null>(null);

  // Fetch product data and lock info when editing
  useEffect(() => {
    let isMounted = true;
    const fetchProductAndLock = async () => {
      if (mode === 'edit' && id && token) {
        setIsLoading(true);
        try {
          const product: Product = await productService.getById(token, parseInt(id));
          if (isMounted) {
            setProductInput({
              name: product.name,
              description: product.description || '',
              price: product.price,
              quantity: product.quantity
            });
            setLockInfo({ editingBy: product.editingBy || null, editingSince: product.editingSince || null });
          }
        } catch (error: any) {
          if (isMounted) setError(error.message || 'Failed to fetch product');
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
    };
    fetchProductAndLock();
    return () => { isMounted = false; };
  }, [mode, id, token]);

  // Unlock on unmount or after save/cancel
  useEffect(() => {
    return () => {
      if (mode === 'edit' && id && token) {
        productService.unlockProduct(token, parseInt(id));
      }
    };
  }, [mode, id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (mode === 'create') {
        await productService.create(token, productInput);
        setSuccess('Product created successfully!');
        // Reset form or redirect
        setProductInput({
          name: '',
          description: '',
          price: 0,
          quantity: 0
        });
        // Redirect after a short delay
        setTimeout(() => navigate('/dashboard/products'), 1500);
      } else if (mode === 'edit' && id) {
        await productService.update(token, parseInt(id), productInput);
        setSuccess('Product updated successfully!');
        // Redirect after a short delay
        setTimeout(() => navigate('/dashboard/products'), 1500);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle price increment/decrement
  const updatePrice = (increment: boolean) => {
    const step = 0.5; // Price changes by $0.50
    const newPrice = increment 
      ? Math.round((productInput.price + step) * 100) / 100 
      : Math.max(0, Math.round((productInput.price - step) * 100) / 100);
    setProductInput({ ...productInput, price: newPrice });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/dashboard/products')}
            className={`flex items-center gap-2 py-2 px-4 rounded-lg ${
              isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <ArrowLeft size={16} />
            <span>Back to Products</span>
          </button>
        </div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {mode === 'create' ? 'Create New Product' : 'Edit Product'}
        </h1>
      </div>
      
      {/* Form */}
      <div className={`p-6 rounded-xl shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-700 border border-red-200">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-100 text-green-700 border border-green-200">
            {success}
          </div>
        )}
        
        {/* Banner for lock info */}
        {lockInfo && lockInfo.editingBy && (
          <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">
            This product is currently being edited by {lockInfo.editingBy} since {lockInfo.editingSince}.
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Product Name *
            </label>
            <input
              type="text"
              value={productInput.name}
              onChange={(e) => setProductInput({ ...productInput, name: e.target.value })}
              required
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Enter product name"
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Description
            </label>
            <textarea
              value={productInput.description}
              onChange={(e) => setProductInput({ ...productInput, description: e.target.value })}
              rows={4}
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Enter product description"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Price *
              </label>
              <div className={`flex items-center p-2 rounded-lg border ${
                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}>
                <button 
                  type="button"
                  onClick={() => updatePrice(false)}
                  className={`p-2 rounded-md ${
                    isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <Minus size={18} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                </button>
                
                <div className="relative flex-1 mx-2">
                  <DollarSign className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`} size={18} />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={productInput.price}
                    onChange={(e) => setProductInput({ ...productInput, price: parseFloat(e.target.value) })}
                    required
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                
                <button 
                  type="button"
                  onClick={() => updatePrice(true)}
                  className={`p-2 rounded-md ${
                    isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <Plus size={18} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                </button>
              </div>
              <div className="mt-2 flex justify-between px-2">
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>$0</span>
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>$100+</span>
              </div>
            </div>
            
            <div>
              <label className={`flex justify-between text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <span>Quantity * <span className="ml-1 font-normal">({productInput.quantity} units)</span></span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={productInput.quantity}
                onChange={(e) => setProductInput({ ...productInput, quantity: parseInt(e.target.value) })}
                className={`w-full h-3 appearance-none rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}
                style={{
                  background: `linear-gradient(to right, 
                    ${isDarkMode ? '#6366F1' : '#4F46E5'} 0%, 
                    ${isDarkMode ? '#6366F1' : '#4F46E5'} ${productInput.quantity}%, 
                    ${isDarkMode ? '#374151' : '#E5E7EB'} ${productInput.quantity}%, 
                    ${isDarkMode ? '#374151' : '#E5E7EB'} 100%)`
                }}
              />
              <div className="mt-2 flex justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setProductInput({ ...productInput, quantity: Math.max(0, productInput.quantity - 1) })}
                    className={`p-1 rounded ${
                      isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    type="number"
                    min="0" 
                    max="100"
                    value={productInput.quantity}
                    onChange={(e) => setProductInput({ ...productInput, quantity: parseInt(e.target.value) })}
                    className={`w-16 px-2 py-1 text-center rounded border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  <button 
                    type="button"
                    onClick={() => setProductInput({ ...productInput, quantity: Math.min(100, productInput.quantity + 1) })}
                    className={`p-1 rounded ${
                      isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="text-xs flex gap-1">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Max: 100</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard/products')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading 
                ? 'Processing...' 
                : mode === 'create' 
                  ? 'Create Product' 
                  : 'Update Product'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm; 