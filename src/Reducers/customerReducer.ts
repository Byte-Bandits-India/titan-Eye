import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Customer } from '../types';

interface CustomerState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
}

const initialState: CustomerState = {
  customers: [],
  loading: false,
  error: null,
};

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    fetchStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchSuccess(state, action: PayloadAction<Customer[]>) {
      state.loading = false;
      state.customers = action.payload;
    },
    fetchFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    customerCreated(state, action: PayloadAction<Customer>) {
      if (!state.customers.some((c) => c.id === action.payload.id)) {
        state.customers = [action.payload, ...state.customers];
      }
    },
    customerUpdated(state, action: PayloadAction<Customer>) {
      state.customers = state.customers.map((c) =>
        c.id === action.payload.id ? action.payload : c
      );
    },
  },
});

export const {
  fetchStart,
  fetchSuccess,
  fetchFailure,
  customerCreated,
  customerUpdated,
} = customerSlice.actions;

export default customerSlice.reducer;
