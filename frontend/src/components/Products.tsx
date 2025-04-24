import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Search, 
  Edit, 
  Trash2, 
  Plus, 
  DollarSign, 
  Filter, 
  X,
  ShoppingCart,
  Eye,
  AlertCircle,
  UserCircle,
  Upload,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  Table,
  FileSpreadsheet,
  ArrowRight,
  Minus,
  Info,
  LayoutGrid,
  List
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { productService, Product, ProductInput, SearchParams } from '../services/productService';
import ProductDetail from './ProductDetail';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ProductsList: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Store all products for client-side pagination
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMyProductsOnly, setShowMyProductsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchParams>({});
  
  // View type state
  const [viewType, setViewType] = useState<'card' | 'table' | 'list'>('card');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(16);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  // Select mode state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [batchDeleteProgress, setBatchDeleteProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productInput, setProductInput] = useState<ProductInput>({
    name: '',
    description: '',
    price: 0,
    quantity: 0
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // CSV Import/Export Functions
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStage, setImportStage] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [previewData, setPreviewData] = useState<{headers: string[], rows: string[][]}>({ headers: [], rows: [] });
  const [importProgress, setImportProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const resetProductInput = () => {
    setProductInput({
      name: '',
      description: '',
      price: 0,
      quantity: 0
    });
  };

  // Fetch products
  const fetchProducts = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (showMyProductsOnly) {
        response = await productService.getMyProducts(token, currentPage, pageSize);
      } else if (Object.keys(filters).length > 0 || searchQuery) {
        const searchParams: SearchParams = {
          ...filters,
          namePattern: searchQuery || undefined,
          page: currentPage,
          size: pageSize
        };
        response = await productService.search(token, searchParams);
      } else {
        response = await productService.getAll(token, currentPage, pageSize);
      }
      
      console.log("API Response:", response);
      console.log("Current Page:", currentPage, "Page Size:", pageSize);
      
      // Add debug check to handle potential null response
      if (!response) {
        console.error('Received null response from API');
        setError('Failed to fetch products: Received empty response');
        setProducts([]);
        setTotalPages(0);
        setTotalElements(0);
        return;
      }
      
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response)) {
        // Handle legacy API returning array directly - Implement client-side pagination
        setAllProducts(response); // Store all products
        const allProducts = response;
        const totalElements = allProducts.length;
        const totalPages = Math.ceil(totalElements / pageSize);
        
        // Get the slice of products for current page
        const start = currentPage * pageSize;
        const end = Math.min(start + pageSize, totalElements);
        const paginatedProducts = allProducts.slice(start, end);
        
        setProducts(paginatedProducts);
        setTotalPages(totalPages);
        setTotalElements(totalElements);
      } else if (response.content) {
        // Update products and pagination info from PaginatedResponse
        setProducts(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
      } else {
        console.error('Unexpected response format:', response);
        setError('Failed to fetch products: Unexpected response format');
        setProducts([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError(error.message || 'An unknown error occurred while fetching products');
      setProducts([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply client-side pagination to the stored products
  const applyClientSidePagination = useCallback(() => {
    if (allProducts.length === 0) return;
    
    const filteredProducts = allProducts.filter(product => {
      // Apply search filter if any
      if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Apply "my products only" filter if enabled
      if (showMyProductsOnly && product.createdBy !== user?.username) {
        return false;
      }
      
      // Apply additional filters if any
      if (filters.minPrice !== undefined && product.price < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false;
      if (filters.minQuantity !== undefined && product.quantity < filters.minQuantity) return false;
      if (filters.maxQuantity !== undefined && product.quantity > filters.maxQuantity) return false;
      
      return true;
    });
    
    const totalElements = filteredProducts.length;
    const totalPages = Math.ceil(totalElements / pageSize);
    
    // Get the slice of products for current page
    const start = currentPage * pageSize;
    const end = Math.min(start + pageSize, totalElements);
    const paginatedProducts = filteredProducts.slice(start, end);
    
    setProducts(paginatedProducts);
    setTotalPages(totalPages);
    setTotalElements(totalElements);
  }, [allProducts, currentPage, pageSize, searchQuery, showMyProductsOnly, filters, user?.username]);
  
  // Effect to fetch products when component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchProducts();
    };
    
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Apply client-side pagination when pagination state or filters change
  useEffect(() => {
    if (allProducts.length > 0) {
      applyClientSidePagination();
    } else {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchQuery, showMyProductsOnly, filters, applyClientSidePagination]);
  
  useEffect(() => {
    // Check for CSV import/export flags from Dashboard
    const shouldOpenImport = sessionStorage.getItem('open_csv_import');
    const shouldTriggerExport = sessionStorage.getItem('trigger_csv_export');
    
    if (shouldOpenImport === 'true') {
      setShowImportModal(true);
      sessionStorage.removeItem('open_csv_import');
    }
    
    if (shouldTriggerExport === 'true') {
      handleExportCSV();
      sessionStorage.removeItem('trigger_csv_export');
    }
  }, []);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    // Only fetch if the page is different
    if (page !== currentPage) {
      setCurrentPage(page);
      setProducts([]); // Clear current products before loading new page
      window.scrollTo(0, 0); // Scroll to top for better UX
    }
  };

  // Handle search and filter
  const handleSearch = () => {
    setCurrentPage(0); // Reset to first page when searching
    if (allProducts.length > 0) {
      applyClientSidePagination();
    } else {
      fetchProducts();
    }
  };

  const handleFilterChange = (key: keyof SearchParams, value: string) => {
    if (value === '') {
      const newFilters = { ...filters };
      delete newFilters[key];
      setFilters(newFilters);
    } else {
      setFilters({
        ...filters,
        [key]: key.includes('Price') || key.includes('Quantity') ? parseFloat(value) : value
      });
    }
  };

  const applyFilters = () => {
    setCurrentPage(0); // Reset to first page when applying filters
    if (allProducts.length > 0) {
      applyClientSidePagination();
    } else {
      fetchProducts();
    }
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({});
    setSearchQuery('');
    setShowMyProductsOnly(false);
    setShowFilters(false);
    setCurrentPage(0); // Reset to first page when resetting filters
    if (allProducts.length > 0) {
      applyClientSidePagination();
    } else {
      fetchProducts();
    }
  };

  // CRUD operations
  const handleCreate = () => {
    resetProductInput();
    setModalMode('create');
    setShowProductModal(true);
  };

  const handleEdit = async (product: Product) => {
    setLockError(null);
    if (!token || !user) return;
    try {
      const lockResult = await productService.lockProduct(token, product.id);
      if (lockResult.editingBy && lockResult.editingBy !== user.username) {
        setLockError(`This product is currently being edited by ${lockResult.editingBy} since ${lockResult.editingSince}.`);
        return;
      }
      setSelectedProduct(product);
      setProductInput({
        name: product.name,
        description: product.description,
        price: product.price,
        quantity: product.quantity
      });
      setModalMode('edit');
      setShowProductModal(true);
    } catch (err: any) {
      setLockError(err.message || 'Failed to lock product for editing.');
    }
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!token || !productToDelete) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Attempt to delete on the server
      const result = await productService.delete(token, productToDelete.id);
      
      // Only update the UI if we get a successful response
      if (result.message === 'Product deleted successfully!') {
        // Remove the deleted product from the state
        setProducts(products.filter(p => p.id !== productToDelete.id));
        setShowDeleteConfirm(false);
        setProductToDelete(null);
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      setError(error.message || 'Failed to delete product. Please try again.');
      // Keep the modal open if there's an error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    try {
      if (modalMode === 'create') {
        const newProduct = await productService.create(token, productInput);
        setProducts([...products, newProduct]);
      } else if (modalMode === 'edit' && selectedProduct) {
        const updatedProduct = await productService.update(token, selectedProduct.id, productInput);
        setProducts(products.map(p => p.id === selectedProduct.id ? updatedProduct : p));
      }
      setShowProductModal(false);
      resetProductInput();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user can edit/delete product
  const canModifyProduct = (product: Product) => {
    // If no user is logged in, they can't modify anything
    if (!user) return false;
    
    // Check if user is an admin by looking for the ROLE_ADMIN or ADMIN role
    const isAdmin = user.roles.some(role => 
      role === 'ROLE_ADMIN' || role === 'ADMIN'
    );
    
    // User can modify if they are the creator or an admin
    return isAdmin || product.createdBy === user.username;
  };

  // Handle batch selection
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedProducts([]);
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      // If all are selected, deselect all
      setSelectedProducts([]);
    } else {
      // Otherwise select all
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const toggleProductSelection = (productId: number) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const confirmBatchDelete = async () => {
    if (!token || selectedProducts.length === 0) return;

    // Make sure user has permission to delete all selected products
    const unauthorizedProducts = products
      .filter(p => selectedProducts.includes(p.id))
      .filter(p => !canModifyProduct(p));
    
    if (unauthorizedProducts.length > 0) {
      setError(`You don't have permission to delete ${unauthorizedProducts.length} of the selected products.`);
      return;
    }

    setIsLoading(true);
    setIsDeleting(true);
    setError(null);
    setBatchDeleteProgress(0);
    
    try {
      // Track successful deletions
      const successfulDeletes: number[] = [];
      const failedDeletes: number[] = [];
      
      // Delete products one by one sequentially
      for (let i = 0; i < selectedProducts.length; i++) {
        const productId = selectedProducts[i];
        
        try {
          // Delete the product
          await productService.delete(token, productId);
          
          // Add to successful deletions
          successfulDeletes.push(productId);
          
          // Update progress
          setBatchDeleteProgress(Math.round(((i + 1) / selectedProducts.length) * 100));
        } catch (error) {
          console.error(`Failed to delete product ${productId}:`, error);
          failedDeletes.push(productId);
        }
      }
      
      // Check if any deletions failed
      if (failedDeletes.length > 0) {
        setError(`Failed to delete ${failedDeletes.length} out of ${selectedProducts.length} products.`);
      }
      
      // Update the UI to remove successfully deleted products
      setProducts(products.filter(p => !successfulDeletes.includes(p.id)));
      
      // Only exit select mode if all deletions were successful
      if (failedDeletes.length === 0) {
        setSelectedProducts([]);
        setShowBatchDeleteConfirm(false);
        setIsSelectMode(false);
      } else {
        // Keep only the failed ones selected
        setSelectedProducts(failedDeletes);
      }
    } catch (error: any) {
      console.error('Batch delete error:', error);
      setError(error.message || 'Failed to delete products. Please try again.');
    } finally {
      setIsLoading(false);
      setIsDeleting(false);
      setBatchDeleteProgress(0);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateCSV = (headers: string[], rows: string[][]) => {
    const errors: string[] = [];
    const requiredHeaders = ['name', 'description', 'price', 'quantity'];
    const headerMap: { [key: string]: number } = {};
    
    // Create case-insensitive header map
    headers.forEach((header, index) => {
      headerMap[header.toLowerCase().trim()] = index;
    });
    
    // Check headers case-insensitively
    requiredHeaders.forEach(required => {
      if (!(required in headerMap)) {
        errors.push(`Missing required column: ${required.charAt(0).toUpperCase() + required.slice(1)}`);
      }
    });

    // Validate data types and required fields
    rows.forEach((row, index) => {
      if (headerMap['name'] !== undefined && !row[headerMap['name']]) {
        errors.push(`Row ${index + 1}: Name is required`);
      }

      if (headerMap['price'] !== undefined) {
        const price = parseFloat(row[headerMap['price']]);
        if (isNaN(price) || price < 0) {
          errors.push(`Row ${index + 1}: Invalid price value`);
        }
      }

      if (headerMap['quantity'] !== undefined) {
        const quantity = parseInt(row[headerMap['quantity']]);
        if (isNaN(quantity) || quantity < 0) {
          errors.push(`Row ${index + 1}: Invalid quantity value`);
        }
      }
    });

    return errors;
  };

  const processCSVFile = async (file: File) => {
    try {
      const text = await file.text();
      // Split by newlines and filter out empty lines
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      // Parse CSV considering quoted values
      const parseCSVLine = (line: string): string[] => {
        const values: string[] = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
              // Handle escaped quotes
              currentValue += '"';
              i++;
            } else {
              // Toggle quote state
              insideQuotes = !insideQuotes;
            }
          } else if (char === ',' && !insideQuotes) {
            // End of value
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        
        // Add the last value
        values.push(currentValue.trim());
        return values;
      };

      const headers = parseCSVLine(lines[0]);
      const dataRows = lines.slice(1).map(line => parseCSVLine(line));

      const errors = validateCSV(headers, dataRows);
      setValidationErrors(errors);

      setPreviewData({
        headers,
        rows: dataRows
      });

      if (errors.length === 0) {
        setImportStage('preview');
      }
    } catch (error: any) {
      setImportError(error.message);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'text/csv') {
      await processCSVFile(file);
    } else {
      setImportError('Please upload a valid CSV file');
    }
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processCSVFile(file);
    }
  };

  const startImport = async () => {
    if (!token || previewData.rows.length === 0) return;

    setImportStage('importing');
    setImportProgress(0);
    setSuccessCount(0);
    setFailedCount(0);

    try {
      const headerMap: { [key: string]: number } = {};
      previewData.headers.forEach((header, index) => {
        headerMap[header.toLowerCase().trim()] = index;
      });

      for (let i = 0; i < previewData.rows.length; i++) {
        const row = previewData.rows[i];
        const product: ProductInput = {
          name: row[headerMap['name']],
          description: row[headerMap['description']],
          price: parseFloat(row[headerMap['price']]),
          quantity: parseInt(row[headerMap['quantity']])
        };

        try {
          await productService.create(token, product);
          setSuccessCount(prev => prev + 1);
        } catch (error) {
          setFailedCount(prev => prev + 1);
        }

        setImportProgress(Math.round(((i + 1) / previewData.rows.length) * 100));
      }

      setImportStage('complete');
      await fetchProducts();
    } catch (error: any) {
      setImportError(error.message);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Description', 'Price', 'Quantity'];
    const csvContent = [
      headers.join(','),
      ...products.map(product => 
        [
          `"${product.name}"`,
          `"${product.description}"`,
          product.price,
          product.quantity
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export Function
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const headers = [['Name', 'Description', 'Price', 'Quantity']];
    const data = products.map(product => [
      product.name,
      product.description,
      product.price,
      product.quantity
    ]);
    autoTable(doc, {
      head: headers,
      body: data,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [40, 167, 69] }, // green header
      margin: { top: 20 },
    });
    doc.save(`products_export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Replace the old import button with this new one
  const renderImportButton = () => (
    <button
      onClick={() => setShowImportModal(true)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all transform hover:scale-105
        ${isDarkMode ? 
          'bg-indigo-600 hover:bg-indigo-700' : 
          'bg-indigo-500 hover:bg-indigo-600'
        } text-white shadow-lg`}
    >
      <Upload className="h-5 w-5" />
      Import CSV
    </button>
  );

  // Add the Import Modal JSX
  const renderImportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-4xl rounded-xl shadow-xl ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      } transform transition-all duration-300 ease-in-out`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Import Products
            </h2>
            <button 
              onClick={() => {
                if (importStage !== 'importing') {
                  setShowImportModal(false);
                  setImportStage('upload');
                  setPreviewData({ headers: [], rows: [] });
                  setValidationErrors([]);
                }
              }}
              className={`p-2 rounded-full transition-colors ${
                isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              } ${importStage === 'importing' ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={importStage === 'importing'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {['upload', 'preview', 'importing', 'complete'].map((stage, index) => (
              <React.Fragment key={stage}>
                <div className={`flex items-center ${index > 0 ? 'ml-2' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    importStage === stage
                      ? 'bg-indigo-600 text-white'
                      : importStage === 'complete' && index <= 3
                        ? 'bg-green-500 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-200 text-gray-500'
                  }`}>
                    {stage === 'upload' && <Upload size={16} />}
                    {stage === 'preview' && <Table size={16} />}
                    {stage === 'importing' && <FileSpreadsheet size={16} />}
                    {stage === 'complete' && <CheckCircle2 size={16} />}
                  </div>
                  {index < 3 && (
                    <div className={`w-16 h-0.5 ml-2 ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>

          {importStage === 'upload' && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                dragActive
                  ? isDarkMode
                    ? 'border-indigo-500 bg-gray-800'
                    : 'border-indigo-500 bg-indigo-50'
                  : isDarkMode
                    ? 'border-gray-700 hover:border-gray-600'
                    : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv"
                className="hidden"
              />
              
              <div className="space-y-4">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                  isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  <FileSpreadsheet size={32} className={
                    isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                  } />
                </div>
                
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  Drop your CSV file here
                </h3>
                
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  or
                </p>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`inline-flex items-center px-4 py-2 rounded-lg ${
                    isDarkMode
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-indigo-500 hover:bg-indigo-600'
                  } text-white transition-colors`}
                >
                  <Upload size={16} className="mr-2" />
                  Browse Files
                </button>
                
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Supported format: CSV
                </p>
              </div>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 rounded">
              <div className="flex items-start">
                <XCircle className="text-red-500 mt-1" size={20} />
                <div className="ml-3">
                  <h3 className="text-red-800 font-medium">Validation Errors</h3>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {importStage === 'preview' && (
            <>
              <div className={`rounded-lg border ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              } overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={
                        isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                      }>
                        {previewData.headers.map((header, index) => (
                          <th key={index} className={`px-4 py-3 text-left text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex} className={`${
                          isDarkMode ? 'border-gray-700' : 'border-gray-200'
                        } border-t`}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className={`px-4 py-3 text-sm ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-800'
                            }`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.rows.length > 5 && (
                  <div className={`px-4 py-3 text-sm ${
                    isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'
                  }`}>
                    + {previewData.rows.length - 5} more rows
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setImportStage('upload');
                    setPreviewData({ headers: [], rows: [] });
                  }}
                  className={`px-4 py-2 rounded-lg ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={startImport}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  Start Import
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {importStage === 'importing' && (
            <div className="py-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    Importing Products...
                  </h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Please wait while we process your data
                  </p>
                </div>
                <div className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {importProgress}%
                </div>
              </div>

              <div className="relative pt-1">
                <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    style={{ width: `${importProgress}%` }}
                    className="animate-pulse shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                  ></div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-green-500" size={20} />
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                      Successful
                    </span>
                  </div>
                  <p className={`text-2xl font-bold mt-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {successCount}
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <XCircle className="text-red-500" size={20} />
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                      Failed
                    </span>
                  </div>
                  <p className={`text-2xl font-bold mt-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {failedCount}
                  </p>
                </div>
              </div>
            </div>
          )}

          {importStage === 'complete' && (
            <div className="py-6 text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                isDarkMode ? 'bg-green-900' : 'bg-green-100'
              }`}>
                <CheckCircle2 className="text-green-500" size={32} />
              </div>
              
              <h3 className={`text-xl font-semibold mt-4 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Import Complete!
              </h3>
              
              <p className={`mt-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Successfully imported {successCount} products
                {failedCount > 0 && ` (${failedCount} failed)`}
              </p>
              
              <div className="mt-6">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportStage('upload');
                    setPreviewData({ headers: [], rows: [] });
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Function to handle price increment/decrement
  const updatePrice = (increment: boolean) => {
    const step = 0.5; // Price changes by $0.50
    const newPrice = increment 
      ? Math.round((productInput.price + step) * 100) / 100 
      : Math.max(0, Math.round((productInput.price - step) * 100) / 100);
    setProductInput({ ...productInput, price: newPrice });
  };

  // Close export menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClick);
    } else {
      document.removeEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showExportMenu]);

  // Render view type toggle
  const renderViewTypeToggle = () => (
    <div className={`flex items-center p-1 rounded-lg border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <button
        onClick={() => setViewType('card')}
        className={`flex items-center justify-center p-2 rounded ${
          viewType === 'card' 
            ? isDarkMode 
              ? 'bg-indigo-600 text-white' 
              : 'bg-indigo-100 text-indigo-700'
            : isDarkMode
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        title="Card View"
      >
        <LayoutGrid size={18} />
      </button>
      <button
        onClick={() => setViewType('table')}
        className={`flex items-center justify-center p-2 rounded mx-1 ${
          viewType === 'table' 
            ? isDarkMode 
              ? 'bg-indigo-600 text-white' 
              : 'bg-indigo-100 text-indigo-700'
            : isDarkMode
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        title="Table View"
      >
        <Table size={18} />
      </button>
      <button
        onClick={() => setViewType('list')}
        className={`flex items-center justify-center p-2 rounded ${
          viewType === 'list' 
            ? isDarkMode 
              ? 'bg-indigo-600 text-white' 
              : 'bg-indigo-100 text-indigo-700'
            : isDarkMode
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        title="List View"
      >
        <List size={18} />
      </button>
    </div>
  );

  // Render card view (existing layout)
  const renderCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => {
        const isLockedByOther = product.editingBy && product.editingBy !== user?.username;
        return (
          <div 
            key={product.id} 
            className={`relative overflow-hidden rounded-xl transition-all duration-200 ${
              isSelectMode 
                ? 'cursor-pointer transform hover:scale-[1.01]' 
                : 'transform hover:scale-[1.02] hover:shadow-xl'
            } ${
              isDarkMode ? 'bg-gray-800 shadow-sm' : 'bg-white shadow-lg'
            } ${
              isSelectMode && selectedProducts.includes(product.id)
                ? isDarkMode 
                  ? 'ring-2 ring-indigo-500' 
                  : 'ring-2 ring-indigo-500'
                : 'border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/50'
            }`}
            onClick={() => isSelectMode && toggleProductSelection(product.id)}
          >
            {/* Selection indicator circle removed */}
            
            <div className="p-5">
              <div className="flex justify-between items-start gap-2 mb-3">
                <h3 className={`font-semibold text-lg line-clamp-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {product.name}
                </h3>
                <div className="flex-shrink-0">
                  <span className={`text-xs font-medium rounded-full px-2 py-1 ${
                    isDarkMode ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    v{product.version}
                  </span>
                </div>
              </div>
              
              <p className={`text-sm mb-5 line-clamp-2 min-h-[40px] ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {product.description || 'No description provided'}
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700/70' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Price
                    </span>
                  </div>
                  <p className={`text-base font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    ${product.price.toFixed(2)}
                  </p>
                </div>
                
                <div className={`p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700/70' : 'bg-gray-50'
                } ${product.quantity <= 10 ? 'ring-1 ring-red-500/20' : ''}`}>
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={16} className={
                      product.quantity > 0 
                        ? product.quantity <= 10
                          ? isDarkMode ? 'text-amber-400' : 'text-amber-600'
                          : isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        : isDarkMode ? 'text-red-400' : 'text-red-600'
                    } />
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Quantity
                    </span>
                  </div>
                  <p className={`text-base font-bold mt-1 ${
                    product.quantity > 0 
                      ? product.quantity <= 10
                        ? isDarkMode ? 'text-amber-400' : 'text-amber-600'
                        : isDarkMode ? 'text-white' : 'text-gray-800'
                      : isDarkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {product.quantity}
                    {product.quantity <= 10 && product.quantity > 0 && (
                      <span className="ml-1 text-xs font-normal">(Low)</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  By: {product.createdBy}
                </div>
                
                {!isSelectMode && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(product);
                      }}
                      disabled={!!isLockedByOther}
                      className={`p-1.5 rounded-full transition-colors ${
                        isLockedByOther
                          ? 'opacity-50 cursor-not-allowed'
                          : isDarkMode
                          ? 'text-indigo-400 hover:bg-indigo-900/30'
                          : 'text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title={isLockedByOther ? `Editing disabled: being edited by ${product.editingBy} since ${product.editingSince}` : 'Edit'}
                    >
                      <Edit size={14} />
                    </button>
                    {isLockedByOther && (
                      <span className="text-xs text-yellow-700 ml-2">
                        Being edited by {product.editingBy}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(product);
                      }}
                      className={`p-1.5 rounded-full transition-colors ${
                        isDarkMode
                          ? 'text-red-400 hover:bg-red-900/30'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/dashboard/products/${product.id}`);
                      }}
                      className={`p-1.5 rounded-full transition-colors ${
                        isDarkMode
                          ? 'text-blue-400 hover:bg-blue-900/30'
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render table view
  const renderTableView = () => (
    <div className={`overflow-x-auto rounded-xl border ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    }`}>
      <table className={`min-w-full divide-y ${
        isDarkMode ? 'divide-gray-700 text-gray-200' : 'divide-gray-200 text-gray-700'
      }`}>
        <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Quantity</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Created By</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Created On</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Updated By</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Updated On</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${
          isDarkMode ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'
        }`}>
          {products.map((product) => {
            const isLockedByOther = !!product.editingBy && product.editingBy !== user?.username;
            const isSelected = selectedProducts.includes(product.id);
            
            return (
              <tr 
                key={product.id} 
                onClick={() => isSelectMode && toggleProductSelection(product.id)}
                className={`transition-colors duration-150 ${
                  isLockedByOther 
                    ? isDarkMode ? 'bg-red-900/20' : 'bg-red-50' 
                    : isSelectMode && isSelected 
                      ? isDarkMode ? 'bg-indigo-900/20 ring-2 ring-indigo-500 ring-inset' : 'bg-indigo-50 ring-2 ring-indigo-500 ring-inset' 
                      : ''
                } ${isSelectMode ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{product.description || 'No description'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    ${product.price.toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    product.quantity > 0 
                      ? product.quantity <= 10
                        ? isDarkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-800'
                        : isDarkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-800'
                      : isDarkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.quantity}
                    {product.quantity <= 10 && product.quantity > 0 && " (Low)"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {product.createdBy}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {product.createdWhen 
                    ? new Date(product.createdWhen).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm hidden lg:table-cell">
                  {product.updatedBy || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                  {product.updatedWhen 
                    ? new Date(product.updatedWhen).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/products/${product.id}`);
                      }}
                      className={`p-1.5 rounded ${
                        isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                      }`}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    
                    {canModifyProduct(product) && !isLockedByOther && (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(product);
                          }}
                          className={`p-1.5 rounded ${
                            isDarkMode ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-blue-100 text-blue-600'
                          }`}
                          disabled={isLockedByOther}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(product);
                          }}
                          className={`p-1.5 rounded ${
                            isDarkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-red-100 text-red-600'
                          }`}
                          disabled={isLockedByOther}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {isLockedByOther && (
                      <span className="text-xs text-yellow-500 ml-2 italic">
                        Locked
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Render list view
  const renderListView = () => (
    <div className="space-y-3">
      {products.map((product) => {
        const isLockedByOther = !!product.editingBy && product.editingBy !== user?.username;
        const isSelected = selectedProducts.includes(product.id);
        
        return (
          <div 
            key={product.id}
            onClick={() => isSelectMode && toggleProductSelection(product.id)}
            className={`flex items-center p-4 rounded-lg border transition-all duration-150 ${
              isLockedByOther
                ? isDarkMode ? 'bg-red-900/20 border-red-700/30' : 'bg-red-50 border-red-200'
                : isSelectMode && isSelected
                  ? isDarkMode ? 'bg-indigo-900/20 ring-2 ring-indigo-500' : 'bg-indigo-50 ring-2 ring-indigo-500'
                  : isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700/50' : 'bg-white border-gray-200 hover:bg-gray-50'
            } ${isSelectMode ? 'cursor-pointer' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {product.name}
                  </h3>
                  <p className={`mt-1 text-xs truncate max-w-md ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {product.description || 'No description provided'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    product.quantity > 0 
                      ? product.quantity <= 10
                        ? isDarkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-800'
                        : isDarkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-800'
                      : isDarkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.quantity} {product.quantity === 1 ? 'item' : 'items'} in stock
                  </span>
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    ${product.price.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400 flex-wrap gap-x-6 gap-y-1">
                <span className="flex items-center gap-1">
                  <UserCircle size={14} /> {product.createdBy}
                </span>
                {product.createdWhen && (
                  <span>
                    Created: {new Date(product.createdWhen).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
                {product.updatedBy && (
                  <span className="flex items-center gap-1">
                    <Edit size={12} /> Updated by: {product.updatedBy}
                  </span>
                )}
                {isLockedByOther && (
                  <span className="text-yellow-500 italic flex items-center gap-1">
                    <AlertCircle size={14} /> Currently being edited by {product.editingBy}
                  </span>
                )}
              </div>
            </div>
            
            <div className="ml-4 flex-shrink-0 flex space-x-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/dashboard/products/${product.id}`);
                }}
                className={`p-2 rounded ${
                  isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="View Details"
              >
                <Eye size={16} />
              </button>
              
              {canModifyProduct(product) && !isLockedByOther && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(product);
                    }}
                    className={`p-2 rounded ${
                      isDarkMode ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-blue-100 text-blue-600'
                    }`}
                    disabled={isLockedByOther}
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(product);
                    }}
                    className={`p-2 rounded ${
                      isDarkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-red-100 text-red-600'
                    }`}
                    disabled={isLockedByOther}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header Section - Improved with better spacing and modern styling */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
              <Package className={`h-6 w-6 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
            {selectedProducts.length > 0 && (
              <span className="ml-2 px-2.5 py-1 text-sm rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300">
                {selectedProducts.length} selected
              </span>
            )}
            {user && user.roles.some(role => role === 'ROLE_ADMIN' || role === 'ADMIN') && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">Admin</span>
            )}
          </div>
          
          {/* Data Management Section - Improved button styling */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {renderViewTypeToggle()}

            <button
              onClick={handleCreate}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all shadow-sm
                ${isDarkMode ? 
                  'bg-indigo-600 hover:bg-indigo-700 text-white' : 
                  'bg-indigo-500 hover:bg-indigo-600 text-white'
                } font-medium`}
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </button>
            
            {renderImportButton()}
            
            <div className="relative">
              <button
                onClick={() => setShowExportMenu((prev) => !prev)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all shadow-sm
                  ${isDarkMode ? 
                    'bg-green-600 hover:bg-green-700 text-white' : 
                    'bg-green-500 hover:bg-green-600 text-white'
                  } font-medium`}
                ref={exportBtnRef}
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showExportMenu && (
                <div className={`absolute right-0 mt-2 w-44 rounded-lg shadow-lg z-50 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                  <button
                    onClick={() => { setShowExportMenu(false); handleExportCSV(); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left rounded-t-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-800'}`}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export as CSV
                  </button>
                  <button
                    onClick={() => { setShowExportMenu(false); handleExportPDF(); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left rounded-b-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-800'}`}
                  >
                    <FileText className="h-4 w-4" />
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showImportModal && renderImportModal()}

        {/* Import Status Messages */}
        {importError && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>Error importing CSV: {importError}</span>
          </div>
        )}
        
        {importSuccess && (
          <div className="mb-6 p-4 rounded-lg bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300 flex items-center gap-2">
            <FileText className="h-5 w-5 flex-shrink-0" />
            <span>CSV imported successfully!</span>
          </div>
        )}
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="relative w-full max-w-md">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} size={18} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={`w-full pl-10 pr-10 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-200 text-gray-800 placeholder-gray-500'
                }`}
              />
              <button 
                onClick={handleSearch}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <Search size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-500'} />
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${
                Object.keys(filters).length > 0 
                  ? isDarkMode ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700' : 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                  : isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700' 
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Filter size={16} />
              <span>Filters {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}</span>
            </button>
            
            <button
              onClick={() => {
                setShowMyProductsOnly(!showMyProductsOnly);
                setCurrentPage(0); // Reset to first page when toggling filter
                if (allProducts.length > 0) {
                  setTimeout(() => applyClientSidePagination(), 0); // Use setTimeout to ensure state is updated
                } else {
                  fetchProducts();
                }
              }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${
                showMyProductsOnly
                  ? isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'
                  : isDarkMode 
                    ? 'bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700' 
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <UserCircle size={16} />
              <span>My Products</span>
            </button>
          
            <button
              onClick={toggleSelectMode}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <CheckCircle2 size={16} />
              <span>Select</span>
            </button>
          </div>
        </div>
        
        {isSelectMode && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={handleSelectAll}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                {selectedProducts.length === products.length && products.length > 0 && 
                  <polyline points="9 11 12 14 22 4"></polyline>
                }
              </svg>
              <span>{selectedProducts.length === products.length && products.length > 0 
                ? 'Deselect All' 
                : 'Select All'}</span>
            </button>
          
            <button
              onClick={() => setShowBatchDeleteConfirm(true)}
              disabled={selectedProducts.length === 0}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                selectedProducts.length === 0
                  ? 'bg-red-300 dark:bg-red-800/30 cursor-not-allowed text-white dark:text-red-300/50' 
                  : 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white'
                }`}
            >
              <Trash2 size={16} />
              <span>Delete Selected</span>
            </button>
          
            <button
              onClick={toggleSelectMode}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                isDarkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
          </div>
        )}
        
        {/* Filters panel */}
        {showFilters && (
          <div className={`p-6 mb-6 rounded-xl border shadow-sm ${
            isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Filter Products</h3>
              <button 
                onClick={() => setShowFilters(false)}
                className={`p-1.5 rounded-full transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`} 
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Min Price
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={filters.minPrice || ''}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className={`pl-9 w-full py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-200 text-gray-800'
                    }`}
                  />
                </div>
              </div>
            
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Max Price
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="999.99"
                    value={filters.maxPrice || ''}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className={`pl-9 w-full py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-200 text-gray-800'
                    }`}
                  />
                </div>
              </div>
            
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Min Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={filters.minQuantity || ''}
                  onChange={(e) => handleFilterChange('minQuantity', e.target.value)}
                  className={`w-full py-2.5 px-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200 text-gray-800'
                  }`}
                />
              </div>
            
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Max Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="999"
                  value={filters.maxQuantity || ''}
                  onChange={(e) => handleFilterChange('maxQuantity', e.target.value)}
                  className={`w-full py-2.5 px-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200 text-gray-800'
                  }`}
                />
              </div>
            </div>
          
            <div className="flex justify-end gap-3">
              <button
                onClick={resetFilters}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Reset
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {/* View selector */}
        <div className="flex justify-end mb-4">
          {/* {renderViewTypeToggle()} */}
        </div>
        
        {/* Products with view types */}
        <div className="relative py-2">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} />
                </div>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className={`p-8 rounded-xl text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 mb-4">
                <Package size={24} className={isDarkMode ? 'text-indigo-300' : 'text-indigo-600'} />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                No products found
              </h3>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {Object.keys(filters).length > 0 || searchQuery 
                  ? "No products match your search criteria. Try adjusting your filters."
                  : "Get started by adding your first product."}
              </p>
              <button
                onClick={handleCreate}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium inline-flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Add Product</span>
              </button>
            </div>
          ) : (
            <>
              {viewType === 'card' && renderCardView()}
              {viewType === 'table' && renderTableView()}
              {viewType === 'list' && renderListView()}
            </>
          )}
        </div>
        
        {/* Pagination */}
        {!isLoading && totalPages > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center justify-center sm:justify-start">
              <div className={`flex items-center gap-2 rounded-lg ${
                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              } p-2 shadow-sm`}>
                {/* Previous Page */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  className={`p-2 rounded ${
                    currentPage === 0
                      ? isDarkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                      : isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  
                  // Simple logic for small number of pages
                  if (totalPages <= 5) {
                    pageNum = i;
                  } 
                  // For many pages, keep current page approximately in the middle
                  else {
                    const halfWindow = Math.floor(5 / 2);
                    
                    if (currentPage < halfWindow) {
                      pageNum = i;
                    } else if (currentPage >= totalPages - halfWindow) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = currentPage - halfWindow + i;
                    }
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 rounded flex items-center justify-center ${
                        currentPage === pageNum
                          ? isDarkMode 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-indigo-100 text-indigo-700'
                          : isDarkMode 
                            ? 'hover:bg-gray-700' 
                            : 'hover:bg-gray-100'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
                
                {/* Next Page */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className={`p-2 rounded ${
                    currentPage >= totalPages - 1
                      ? isDarkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                      : isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Page size selector */}
            <div className="flex items-center justify-center sm:justify-end gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Show:
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value, 10);
                    setIsLoading(true); // Show loading spinner immediately
                    setProducts([]);    // Optionally clear products for instant feedback
                    setAllProducts([]); // Clear allProducts to force fetch
                    setPageSize(newSize);
                    setCurrentPage(0); // Reset to first page when changing page size
                  }}
                  className={`rounded-md border p-1 text-sm ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  {[16, 32, 64, 128, 256, 512, 1024].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              
              {/* Total items count */}
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {totalElements > 0 ? (
                  <>
                    <span className="hidden sm:inline">Showing </span>
                    {currentPage * pageSize + 1}-
                    {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements}
                  </>
                ) : 'No products'}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-xl shadow-xl ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {modalMode === 'create' ? 'Add New Product' : 'Edit Product'}
                </h2>
                <button 
                  onClick={() => setShowProductModal(false)}
                  className={isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={productInput.name}
                    onChange={(e) => setProductInput({ ...productInput, name: e.target.value })}
                    required
                    className={`w-full px-4 py-2.5 rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description
                  </label>
                  <textarea
                    value={productInput.description || ''}
                    onChange={(e) => setProductInput({ ...productInput, description: e.target.value })}
                    rows={3}
                    className={`w-full px-4 py-2.5 rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Price *
                    </label>
                    <div className={`flex items-center p-1.5 rounded-md border ${
                      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                      <button 
                        type="button"
                        onClick={() => updatePrice(false)}
                        className={`p-1.5 rounded-md ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        <Minus size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                      </button>
                      
                      <div className="relative flex-1 mx-1">
                        <DollarSign className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        }`} size={16} />
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={productInput.price}
                          onChange={(e) => setProductInput({ ...productInput, price: parseFloat(e.target.value) })}
                          required
                          className={`w-full pl-10 pr-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                            isDarkMode
                              ? 'bg-gray-800 border-gray-700 text-white'
                              : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        />
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => updatePrice(true)}
                        className={`p-1.5 rounded-md ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        <Plus size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                      </button>
                    </div>
                    <div className="mt-1 flex justify-between px-2">
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>$0</span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>$100+</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className={`flex justify-between text-sm font-medium mb-1.5 ${
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
                      className={`w-full h-2 appearance-none rounded-md ${
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
                    <div className="mt-1.5 flex justify-between">
                      <div className="flex items-center gap-1.5">
                        <button 
                          type="button"
                          onClick={() => setProductInput({ ...productInput, quantity: Math.max(0, productInput.quantity - 1) })}
                          className={`p-1 rounded ${
                            isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          <Minus size={10} />
                        </button>
                        <input
                          type="number"
                          min="0" 
                          max="100"
                          value={productInput.quantity}
                          onChange={(e) => setProductInput({ ...productInput, quantity: parseInt(e.target.value) })}
                          className={`w-12 px-1.5 py-1 text-center text-sm rounded border ${
                            isDarkMode
                              ? 'bg-gray-800 border-gray-700 text-white'
                              : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        />
                        <button 
                          type="button"
                          onClick={() => setProductInput({ ...productInput, quantity: Math.min(100, productInput.quantity + 1) })}
                          className={`p-1 rounded ${
                            isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className={`px-4 py-2 rounded-md font-medium ${
                      isDarkMode
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-70"
                  >
                    {isLoading ? 'Processing...' : modalMode === 'create' ? 'Create Product' : 'Update Product'}
                  </button>
                </div>
              </form>
              {selectedProduct && (
                <div className={`mt-6 p-4 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} shadow-sm`}>
                  <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                    <Info size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                    Product Audit Trail
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium">Created By:</span>
                      <span className="ml-2">{selectedProduct.createdBy || <span className="italic text-gray-400">N/A</span>}</span>
                    </div>
                    <div>
                      <span className="font-medium">Created When:</span>
                      <span className="ml-2">{selectedProduct.createdWhen ? new Date(selectedProduct.createdWhen).toLocaleString() : <span className="italic text-gray-400">N/A</span>}</span>
                    </div>
                    <div>
                      <span className="font-medium">Updated By:</span>
                      <span className="ml-2">{selectedProduct.updatedBy || <span className="italic text-gray-400">N/A</span>}</span>
                    </div>
                    <div>
                      <span className="font-medium">Updated When:</span>
                      <span className="ml-2">{selectedProduct.updatedWhen ? new Date(selectedProduct.updatedWhen).toLocaleString() : <span className="italic text-gray-400">N/A</span>}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Delete confirmation modal */}
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
                Are you sure you want to delete <span className="font-semibold">{productToDelete?.name}</span>? 
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
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Batch delete confirmation */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-xl shadow-xl ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {isDeleting ? 'Deleting Products...' : 'Confirm Batch Delete'}
              </h2>
              
              {isDeleting ? (
                <div className="py-4">
                  <div className="flex justify-between mb-2">
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                      Deleting {selectedProducts.length} products...
                    </span>
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                      {batchDeleteProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full" 
                      style={{ width: `${batchDeleteProgress}%` }}
                    ></div>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Please wait while the products are being deleted...
                  </p>
                </div>
              ) : (
                <>
                  <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                    Are you sure you want to delete <span className="font-semibold">{selectedProducts.length} selected products</span>? 
                    This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowBatchDeleteConfirm(false)}
                      className={`px-4 py-2 rounded-md font-medium ${
                        isDarkMode
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmBatchDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:opacity-70 disabled:hover:bg-red-600"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : `Delete ${selectedProducts.length} Products`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-4xl rounded-xl shadow-xl ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          } transform transition-all duration-300 ease-in-out`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Import Products
                </h2>
                <button 
                  onClick={() => {
                    if (importStage !== 'importing') {
                      setShowImportModal(false);
                      setImportStage('upload');
                      setPreviewData({ headers: [], rows: [] });
                      setValidationErrors([]);
                    }
                  }}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                  } ${importStage === 'importing' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={importStage === 'importing'}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center justify-center mb-8">
                {['upload', 'preview', 'importing', 'complete'].map((stage, index) => (
                  <React.Fragment key={stage}>
                    <div className={`flex items-center ${index > 0 ? 'ml-2' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        importStage === stage
                          ? 'bg-indigo-600 text-white'
                          : importStage === 'complete' && index <= 3
                            ? 'bg-green-500 text-white'
                            : isDarkMode
                              ? 'bg-gray-700 text-gray-400'
                              : 'bg-gray-200 text-gray-500'
                      }`}>
                        {stage === 'upload' && <Upload size={16} />}
                        {stage === 'preview' && <Table size={16} />}
                        {stage === 'importing' && <FileSpreadsheet size={16} />}
                        {stage === 'complete' && <CheckCircle2 size={16} />}
                      </div>
                      {index < 3 && (
                        <div className={`w-16 h-0.5 ml-2 ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {importStage === 'upload' && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    dragActive
                      ? isDarkMode
                        ? 'border-indigo-500 bg-gray-800'
                        : 'border-indigo-500 bg-indigo-50'
                      : isDarkMode
                        ? 'border-gray-700 hover:border-gray-600'
                        : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".csv"
                    className="hidden"
                  />
                  
                  <div className="space-y-4">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <FileSpreadsheet size={32} className={
                        isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                      } />
                    </div>
                    
                    <h3 className={`text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      Drop your CSV file here
                    </h3>
                    
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      or
                    </p>
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`inline-flex items-center px-4 py-2 rounded-lg ${
                        isDarkMode
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : 'bg-indigo-500 hover:bg-indigo-600'
                      } text-white transition-colors`}
                    >
                      <Upload size={16} className="mr-2" />
                      Browse Files
                    </button>
                    
                    <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Supported format: CSV
                    </p>
                  </div>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 rounded">
                  <div className="flex items-start">
                    <XCircle className="text-red-500 mt-1" size={20} />
                    <div className="ml-3">
                      <h3 className="text-red-800 font-medium">Validation Errors</h3>
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {importStage === 'preview' && (
                <>
                  <div className={`rounded-lg border ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  } overflow-hidden`}>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className={
                            isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                          }>
                            {previewData.headers.map((header, index) => (
                              <th key={index} className={`px-4 py-3 text-left text-sm font-medium ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.rows.slice(0, 5).map((row, rowIndex) => (
                            <tr key={rowIndex} className={`${
                              isDarkMode ? 'border-gray-700' : 'border-gray-200'
                            } border-t`}>
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className={`px-4 py-3 text-sm ${
                                  isDarkMode ? 'text-gray-300' : 'text-gray-800'
                                }`}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewData.rows.length > 5 && (
                      <div className={`px-4 py-3 text-sm ${
                        isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'
                      }`}>
                        + {previewData.rows.length - 5} more rows
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setImportStage('upload');
                        setPreviewData({ headers: [], rows: [] });
                      }}
                      className={`px-4 py-2 rounded-lg ${
                        isDarkMode
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Back
                    </button>
                    <button
                      onClick={startImport}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                    >
                      Start Import
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              )}

              {importStage === 'importing' && (
                <div className="py-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className={`font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        Importing Products...
                      </h3>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Please wait while we process your data
                      </p>
                    </div>
                    <div className={`text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      {importProgress}%
                    </div>
                  </div>

                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        style={{ width: `${importProgress}%` }}
                        className="animate-pulse shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                      ></div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-green-500" size={20} />
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                          Successful
                        </span>
                      </div>
                      <p className={`text-2xl font-bold mt-2 ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        {successCount}
                      </p>
                    </div>

                    <div className={`p-4 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <XCircle className="text-red-500" size={20} />
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                          Failed
                        </span>
                      </div>
                      <p className={`text-2xl font-bold mt-2 ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        {failedCount}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {importStage === 'complete' && (
                <div className="py-6 text-center">
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                    isDarkMode ? 'bg-green-900' : 'bg-green-100'
                  }`}>
                    <CheckCircle2 className="text-green-500" size={32} />
                  </div>
                  
                  <h3 className={`text-xl font-semibold mt-4 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    Import Complete!
                  </h3>
                  
                  <p className={`mt-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Successfully imported {successCount} products
                    {failedCount > 0 && ` (${failedCount} failed)`}
                  </p>
                  
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportStage('upload');
                        setPreviewData({ headers: [], rows: [] });
                      }}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Show lock error if present */}
      {lockError && (
        <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">
          {lockError}
        </div>
      )}
    </div>
  );
};

const Products: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ProductsList />} />
      <Route path="/:id" element={<ProductDetail />} />
    </Routes>
  );
};

export default Products; 