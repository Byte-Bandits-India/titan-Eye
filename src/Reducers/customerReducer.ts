import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { Customer, CustomerState } from '../types';

const initialState: CustomerState = {
  customers: [],
  error: null,
  loading: false,
};

const customerSlice = createSlice({
  initialState,
  name: 'customers',
  reducers: {
    customerCreated(state, action: PayloadAction<Customer>) {
      if (!state.customers.some((c) => c.id === action.payload.id)) {
        state.customers = [action.payload, ...state.customers];
      }
    },
    customerDeleted(state, action: PayloadAction<string>) {
      state.customers = state.customers.filter((c) => c.id !== action.payload);
    },
    customerUpdated(state, action: PayloadAction<Customer>) {
      const exists = state.customers.some((c) => c.id === action.payload.id);

      if (exists) {
        state.customers = state.customers.map((c) => (c.id === action.payload.id ? action.payload : c));
      } else {
        state.customers = [action.payload, ...state.customers];
      }
    },
    fetchFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchSuccess(state, action: PayloadAction<Customer[]>) {
      state.loading = false;
      state.customers = action.payload;
    },
  },
});

export const { customerCreated, customerDeleted, customerUpdated, fetchFailure, fetchStart, fetchSuccess } =
  customerSlice.actions;

export default customerSlice.reducer;
