import * as React from 'react';
import { API_BASE_URL } from '../options/Option';
import { useAppDispatch, useAppSelector } from '../store';
import { customerCreated, customerUpdated } from '../Reducers/customerReducer';
import { fetchUsersAction } from '../Actions/userActions';
import { fetchCustomersAction } from '../Actions/customerActions';
import { useNotificationLog } from '../components/ui/notificationLog';
import type { Customer } from '../types';

type NoOptomEventPayload = {
  customerId: string;
  customerName: string;
  storeName: null | string;
};

export function useSSE(): void {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const customers = useAppSelector((state) => state.customers.customers);
  const user = useAppSelector((state) => state.auth.user);
  const { addLogNotification } = useNotificationLog();
  const customersRef = React.useRef(customers);
  const userRef = React.useRef(user);

  React.useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  React.useEffect(() => {
    userRef.current = user;
  }, [user]);

  React.useEffect(() => {
    if (!isAuthenticated) return;

    // Initial fetch on mount / authentication
    dispatch(fetchCustomersAction());
    dispatch(fetchUsersAction());

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
          dispatch(customerCreated(data));
          dispatch(fetchCustomersAction());
          dispatch(fetchUsersAction());
          window.dispatchEvent(new CustomEvent('titan:sse_event', { detail: { type, data } }));

          // Patient registration is a store/admin administrative event -
          // Optoms only care once a call is actually offered to them.
          if (userRef.current?.role !== 'optom' && !currentCustomers.some((c) => c.id === data.id)) {
            addLogNotification({
              title: 'Patient Registered',
              description: `Successfully added ${data.name} with ID ${data.id}.`,
              type: 'patient_registered',
            });
          }
        } else if (type === 'CUSTOMER_UPDATED') {
          const oldCust = currentCustomers.find((c) => c.id === data.id);
          const currentUser = userRef.current;
          const isOwnStoreRequest =
            currentUser?.role === 'store' &&
            !!currentUser.storeName &&
            !!data.storeName &&
            currentUser.storeName.toLowerCase() === data.storeName.toLowerCase();
          // Optoms get a dedicated, actionable incoming-call alert (with sound and
          // Attend/View/Ignore) from the notifications list in NotificationPopover -
          // the generic log line would just be redundant noise on top of that.
          const skipCallInitiatedLog = isOwnStoreRequest || currentUser?.role === 'optom';

          if (data.callActive && (!oldCust || !oldCust.callActive)) {
            if (!skipCallInitiatedLog) {
              addLogNotification({
                title: 'Call Initiated',
                description: `Call initiated by ${data.storeName} for ${data.name}.`,
                type: 'call_initiated',
              });
            }
          } else if (data.status === 'Closed' && oldCust?.status !== 'Closed') {
            addLogNotification({
              title: 'Call Closed',
              description: `Consultation request for ${data.name} has been closed automatically.`,
              type: 'call_closed',
            });
          } else if (data.status === 'Completed' && (!oldCust || oldCust.status !== 'Completed')) {
            addLogNotification({
              title: 'Assessment Complete',
              description: `Clinical assessment submitted for ${data.name} (ID: ${data.id}).`,
              type: 'assessment_complete',
            });
          } else if (
            data.status === 'Accepted' &&
            oldCust?.status === 'Initiated' &&
            !data.callActive
          ) {
            addLogNotification({
              title: 'Assessment Accepted',
              description: 'Patient assessment status updated to Accepted.',
              type: 'assessment_accepted',
            });
          }

          dispatch(customerUpdated(data));
          dispatch(fetchCustomersAction());
          dispatch(fetchUsersAction());
          window.dispatchEvent(new CustomEvent('titan:sse_event', { detail: { type, data } }));
        } else if (type === 'NO_OPTOM_AVAILABLE' || type === 'OPTOM_NO_RESPONSE') {
          const payload = data as unknown as NoOptomEventPayload;
          const currentUser = userRef.current;
          const isMatchingStore =
            currentUser?.role === 'store' &&
            !!currentUser.storeName &&
            !!payload.storeName &&
            currentUser.storeName.toLowerCase() === payload.storeName.toLowerCase();

          if (type === 'NO_OPTOM_AVAILABLE' && currentUser?.role === 'admin') {
            addLogNotification({
              description: `${payload.storeName || 'A store'} requested an Optom for ${payload.customerName}, but no Optom doctors are currently available.`,
              title: 'No Optoms Available',
              type: 'no_optom_available',
            });
          } else if (isMatchingStore) {
            addLogNotification({
              customerId: payload.customerId,
              description:
                type === 'NO_OPTOM_AVAILABLE'
                  ? 'All Optom doctors are currently busy. Please try again in a few minutes.'
                  : `No Optom doctor answered your request for ${payload.customerName}. Please try requesting again.`,
              title: type === 'NO_OPTOM_AVAILABLE' ? 'Optom Unavailable' : 'No Optom Answered',
              type: 'no_optom_available',
            });
          }
        } else if (
          type === 'USER_CREATED' ||
          type === 'USER_UPDATED' ||
          type === 'USER_DELETED' ||
          type === 'USER_STATUS_CHANGE' ||
          type === 'ADMIN_LOG_CREATED'
        ) {
          dispatch(fetchCustomersAction());
          dispatch(fetchUsersAction());
          window.dispatchEvent(new CustomEvent('titan:sse_event', { detail: { type, data } }));
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
  }, [isAuthenticated, addLogNotification, dispatch]);
}
