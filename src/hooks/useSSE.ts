import * as React from 'react';

import type { NoOptometristEventPayload, SSEEventDetail } from '../types';

import { fetchCustomersAction } from '../Actions/customerActions';
import { fetchUsersAction } from '../Actions/userActions';
import { useNotificationLog } from '../components/ui/notificationLog';
import { API_BASE_URL } from '../options/Option';
import { customerCreated, customerUpdated } from '../Reducers/customerReducer';
import { useAppDispatch, useAppSelector } from '../store';

export function useSSE(): void {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const { addLogNotification } = useNotificationLog();
  const userRef = React.useRef(user);

  React.useEffect(() => {
    userRef.current = user;
  }, [user]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Initial fetch on mount / authentication
    dispatch(fetchCustomersAction());
    dispatch(fetchUsersAction());

    const eventSource = new EventSource(`${API_BASE_URL}/events`, {
      withCredentials: true,
    });

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const { data, type } = JSON.parse(event.data as string) as SSEEventDetail;

        if (type === 'CUSTOMER_CREATED') {
          dispatch(customerCreated(data));
          dispatch(fetchCustomersAction());
          dispatch(fetchUsersAction());
          window.dispatchEvent(new CustomEvent('titan:sse_event', { detail: { data, type } }));
        } else if (type === 'CUSTOMER_UPDATED') {
          dispatch(customerUpdated(data));
          dispatch(fetchCustomersAction());
          dispatch(fetchUsersAction());
          window.dispatchEvent(new CustomEvent('titan:sse_event', { detail: { data, type } }));
        } else if (type === 'NO_OPTOMETRIST_AVAILABLE' || type === 'OPTOMETRIST_NO_RESPONSE') {
          const payload = data as NoOptometristEventPayload;
          const currentUser = userRef.current;
          const isMatchingStore =
            currentUser?.role === 'store' &&
            !!currentUser.storeName &&
            !!payload.storeName &&
            currentUser.storeName.toLowerCase() === payload.storeName.toLowerCase();

          if (type === 'NO_OPTOMETRIST_AVAILABLE' && currentUser?.role === 'admin') {
            addLogNotification({
              description: `${payload.storeName || 'A store'} requested an Optometrist for ${payload.customerName}, but no Optometrist doctors are currently available.`,
              title: 'No Optometrists Available',
              type: 'no_optometrist_available',
            });
          } else if (isMatchingStore) {
            addLogNotification({
              customerId: payload.customerId,
              description:
                type === 'NO_OPTOMETRIST_AVAILABLE'
                  ? 'All Optometrist doctors are currently busy. Please try again in a few minutes.'
                  : `No Optometrist doctor answered your request for ${payload.customerName}. Please try requesting again.`,
              title: type === 'NO_OPTOMETRIST_AVAILABLE' ? 'Optometrist Unavailable' : 'No Optometrist Answered',
              type: 'no_optometrist_available',
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
          window.dispatchEvent(new CustomEvent('titan:sse_event', { detail: { data, type } }));
        } else if (type === 'CALL_SESSION_READY' || type === 'CALL_SESSION_ENDED') {
          window.dispatchEvent(new CustomEvent('titan:sse_event', { detail: { data, type } }));
          window.dispatchEvent(
            new CustomEvent(
              type === 'CALL_SESSION_READY' ? 'titan:call_session_ready' : 'titan:call_session_ended',
              {
                detail: data,
              }
            )
          );
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
