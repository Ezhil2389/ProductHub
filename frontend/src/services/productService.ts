import api from './axiosConfig';

const API_URL = 'http://localhost:8080/api';

export interface Product {
  id: number;
  version: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  createdBy: string;
  updatedBy?: string | null;
  createdWhen?: string | null;
  updatedWhen?: string | null;
  editingBy?: string | null;
  editingSince?: string | null;
}

export interface ProductInput {
  name: string;
  description?: string;
  price: number;
  quantity: number;
}

export interface SearchParams {
  namePattern?: string;
  minPrice?: number;
  maxPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  createdByUsername?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export const productService = {
  getAll: async (token: string, page = 0, size = 10, sort = 'id,desc'): Promise<PaginatedResponse<Product>> => {
    try {
      const response = await api.get('/products', {
        params: { page, size, sort }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch products');
    }
  },

  getById: async (token: string, id: number): Promise<Product> => {
    try {
      const response = await api.get(`/products/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch product');
    }
  },

  getMyProducts: async (token: string, page = 0, size = 10, sort = 'id,desc'): Promise<PaginatedResponse<Product>> => {
    try {
      const response = await api.get('/products/my-products', {
        params: { page, size, sort }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch my products');
    }
  },

  create: async (token: string, product: ProductInput): Promise<Product> => {
    try {
      const response = await api.post('/products', product);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create product');
    }
  },

  update: async (token: string, id: number, product: ProductInput): Promise<Product> => {
    try {
      const response = await api.put(`/products/${id}`, product);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update product');
    }
  },

  delete: async (token: string, id: number): Promise<{ message: string }> => {
    try {
      const response = await api.delete(`/products/${id}`);
      
      // Check if we got a successful response
      if (response.status !== 200) {
        throw new Error('Failed to delete product: Server returned unexpected status');
      }
      
      // Ensure we have a response with a message
      if (!response.data || !response.data.message) {
        throw new Error('Failed to delete product: Invalid server response');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Delete error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        throw new Error(error.response.data?.message || 'Failed to delete product');
      }
      throw new Error('Network error when deleting product');
    }
  },

  search: async (token: string, params: SearchParams): Promise<PaginatedResponse<Product>> => {
    try {
      // Build query string from search params
      const queryParams = new URLSearchParams();
      
      if (params.namePattern) queryParams.append('namePattern', params.namePattern);
      if (params.minPrice !== undefined) queryParams.append('minPrice', params.minPrice.toString());
      if (params.maxPrice !== undefined) queryParams.append('maxPrice', params.maxPrice.toString());
      if (params.minQuantity !== undefined) queryParams.append('minQuantity', params.minQuantity.toString());
      if (params.maxQuantity !== undefined) queryParams.append('maxQuantity', params.maxQuantity.toString());
      if (params.createdByUsername) queryParams.append('createdByUsername', params.createdByUsername);
      if (params.page !== undefined) queryParams.append('page', params.page.toString());
      if (params.size !== undefined) queryParams.append('size', params.size.toString());
      if (params.sort !== undefined) queryParams.append('sort', params.sort);
      
      const queryString = queryParams.toString();
      const url = `/products/search${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to search products');
    }
  },

  lockProduct: async (token: string, id: number): Promise<{ editingBy: string | null; editingSince: string | null }> => {
    try {
      const response = await api.post(`/products/${id}/lock`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to lock product');
    }
  },

  unlockProduct: async (token: string, id: number): Promise<void> => {
    try {
      await api.post(`/products/${id}/unlock`);
    } catch (error: any) {
      // Not throwing error to avoid blocking UI on unlock failure
      console.error('Failed to unlock product', error);
    }
  }
}; 