import type { Customer } from '../types';

export function hasCustomerFeedback(customer: Pick<Customer, 'feedbackEase' | 'patientFeedback'>): boolean {
  return Boolean(customer.feedbackEase || (customer.patientFeedback && customer.patientFeedback.trim()));
}
