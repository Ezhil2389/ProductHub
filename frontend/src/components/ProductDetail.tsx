import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  DollarSign, 
  ShoppingCart, 
  Edit, 
  Trash2,
  AlertCircle,
  Info
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { productService, Product } from '../services/productService';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isDarkMode } = useTheme();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!token || !id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const fetchedProduct = await productService.getById(token, parseInt(id));
        setProduct(fetchedProduct);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProduct();
  }, [token, id]);

  // Check if user can edit/delete product
  const canModifyProduct = (product: Product) => {
    if (!user) return false;
    return user.roles.includes('ADMIN') || product.createdBy === user.username;
  };

  const handleDelete = async () => {
    if (!token || !product) return;

    setIsLoading(true);
    try {
      const result = await productService.delete(token, product.id);
      console.log('Delete result from detail view:', result);
      
      setShowDeleteConfirm(false);
      
      // Show a success message or handle accordingly
      setError(null);
      
      // Navigate back with a small delay to ensure the API has time to process
      setTimeout(() => {
        navigate('/dashboard/products');
      }, 500);
    } catch (error: any) {
      setError(error.message);
      console.error('Delete error in detail component:', error);
      setShowDeleteConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-red-100 text-red-700 flex items-center gap-2">
        <AlertCircle size={24} />
        <div>
          <h3 className="font-semibold text-lg">Error</h3>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/dashboard/products')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Go Back to Products
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 rounded-lg bg-yellow-100 text-yellow-700 flex items-center gap-2">
        <Info size={24} />
        <div>
          <h3 className="font-semibold text-lg">Product Not Found</h3>
          <p>The product you're looking for doesn't exist or you don't have permission to view it.</p>
          <button 
            onClick={() => navigate('/dashboard/products')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Go Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Navigation and actions */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => navigate('/dashboard/products')}
          className={`flex items-center gap-2 py-2 px-4 rounded-lg ${
            isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
          }`}
        >
          <ArrowLeft size={16} />
          <span>Back to Products</span>
        </button>
        
        {canModifyProduct(product) && (
          <div className="flex gap-3">
            <button 
              onClick={() => navigate(`/dashboard/products/edit/${product.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Edit size={16} />
              <span>Edit</span>
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
      
      {/* Product Details */}
      <div className={`p-8 rounded-2xl ${
        isDarkMode ? 'bg-gray-800' : 'bg-white border border-gray-300'
      }`}>
        <div className="flex justify-between items-start mb-6">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {product.name}
          </h1>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              isDarkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
            }`}>
              Version {product.version}
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Created by: {product.createdBy}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Product Details
            </h2>
            <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {product.description || 'No description provided.'}
              </p>
            </div>
          </div>
          
          <div>
            <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Pricing & Inventory
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className={isDarkMode ? 'text-green-400' : 'text-green-500'} size={20} />
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Price</span>
                </div>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  ${product.price.toFixed(2)}
                </p>
              </div>
              
              <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className={
                    product.quantity > 0
                      ? isDarkMode ? 'text-blue-400' : 'text-blue-500'
                      : isDarkMode ? 'text-red-400' : 'text-red-500'
                  } size={20} />
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Quantity</span>
                </div>
                <p className={`text-2xl font-bold ${
                  product.quantity > 0
                    ? isDarkMode ? 'text-white' : 'text-gray-800'
                    : isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  {product.quantity}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pt-6`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Product Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Product ID
              </p>
              <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{product.id}</p>
            </div>
            
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Version
              </p>
              <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{product.version}</p>
            </div>
            
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Created By
              </p>
              <p className={`mt-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{product.createdBy}</p>
            </div>
          </div>
        </div>

        {/* Audit Information */}
        <div className={`mt-8 p-4 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} shadow-sm`}>
          <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
            <Info size={18} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
            Product Audit Trail
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Created By:</span>
              <span className="ml-2">{product.createdBy || <span className="italic text-gray-400">N/A</span>}</span>
            </div>
            <div>
              <span className="font-medium">Created When:</span>
              <span className="ml-2">{product.createdWhen ? new Date(product.createdWhen).toLocaleString() : <span className="italic text-gray-400">N/A</span>}</span>
            </div>
            <div>
              <span className="font-medium">Updated By:</span>
              <span className="ml-2">{product.updatedBy || <span className="italic text-gray-400">N/A</span>}</span>
            </div>
            <div>
              <span className="font-medium">Updated When:</span>
              <span className="ml-2">{product.updatedWhen ? new Date(product.updatedWhen).toLocaleString() : <span className="italic text-gray-400">N/A</span>}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-xl shadow-xl ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Confirm Delete
              </h2>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Are you sure you want to delete <span className="font-semibold">{product.name}</span>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`px-4 py-2 rounded-md font-medium ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:opacity-70"
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail; 