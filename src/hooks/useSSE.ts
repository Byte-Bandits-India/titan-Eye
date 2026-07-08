import * as React from 'react';
import { API_BASE_URL } from '../options/Option';
import { useAppDispatch, useAppSelector } from '../store';
import { customerCreated, customerUpdated } from '../Reducers/customerReducer';
import { useToast } from '../components/ui/toast';
import type { Customer } from '../types';

export function useSSE(): void {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const customers = useAppSelector((state) => state.customers.customers);
  const { toast } = useToast();
  const customersRef = React.useRef(customers);

  React.useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  React.useEffect(() => {
    if (!token) return;

    const eventSource = new EventSource(`${API_BASE_URL}/events`, {
      withCredentials: true,
    });

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const { type, data } = JSON.parse(event.data as string) as {
          type: string;
          data: Customer;
        };
        const currentCustomers = customersRef.current;

        if (type === 'CUSTOMER_CREATED') {
          if (currentCustomers.some((c) => c.id === data.id)) return;

          toast({
            title: 'Patient Registered',
            description: `Successfully added ${data.name} with ID ${data.id}.`,
            type: 'success',
          });
          dispatch(customerCreated(data));
        } else if (type === 'CUSTOMER_UPDATED') {
          const oldCust = currentCustomers.find((c) => c.id === data.id);

          if (data.callActive && (!oldCust || !oldCust.callActive)) {
            toast({
              title: 'Call Initiated',
              description: `Call initiated by ${data.storeName} for ${data.name}.`,
              type: 'info',
            });
          } else if (!data.callActive && oldCust?.callActive && data.status !== 'Closed') {
            toast({
              title: 'Call Ended',
              description: `Call session ended for ${data.name} (ID: ${data.id}).`,
              type: 'info',
            });
          } else if (data.status === 'Closed' && oldCust?.status !== 'Closed') {
            toast({
              title: 'Call Closed',
              description: `Consultation request for ${data.name} has been closed automatically.`,
              type: 'info',
            });
          } else if (data.status === 'Completed' && (!oldCust || oldCust.status !== 'Completed')) {
            toast({
              title: 'Assessment Complete',
              description: `Clinical assessment submitted for ${data.name} (ID: ${data.id}).`,
              type: 'success',
            });
          } else if (
            data.status === 'Accepted' &&
            oldCust?.status === 'Initiated' &&
            !data.callActive
          ) {
            toast({
              title: 'Assessment Accepted',
              description: 'Patient assessment status updated to Accepted.',
              type: 'success',
            });
          }

          dispatch(customerUpdated(data));
        }
      } catch (err) {
        console.error('Error handling SSE message:', err);
      }
    };

    eventSource.onerror = (err: Event) => {
      console.error('SSE connection error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [token, toast, dispatch]);
}
