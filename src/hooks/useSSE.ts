import * as React from 'react';

import type { Customer, NoOptometristEventPayload, SSEEventDetail } from '../types';

import { fetchCustomersAction } from '../Actions/customerActions';
import { fetchUsersAction } from '../Actions/userActions';
import { useNotificationLog } from '../components/ui/notificationLog';
import { API_BASE_URL } from '../options/Option';
import { customerCreated, customerUpdated } from '../Reducers/customerReducer';
import { useAppDispatch, useAppSelector } from '../store';
import { decryptClientPayload, isEncryptedEnvelope } from '../Util/cryptoClient';

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

    dispatch(fetchCustomersAction());
    dispatch(fetchUsersAction());

    const eventSource = new EventSource(`${API_BASE_URL}/events`, {
      withCredentials: true,
    });

    eventSource.onmessage = async (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(String(event.data)) as SSEEventDetail;
        let eventData = parsed.data;

        if (eventData && typeof eventData === 'object' && isEncryptedEnvelope(eventData)) {
          try {
            eventData = await decryptClientPayload(eventData);
          } catch {
            /* fallback to raw */
          }
        }

        const { type } = parsed;

        if (type === 'CUSTOMER_CREATED') {
          const cust = eventData as Customer;
          dispatch(customerCreated(cust));
          dispatch(fetchCustomersAction());
          dispatch(fetchUsersAction());

          window.dispatchEvent(new CustomEvent('titan:sse_event', { detail: { data: eventData, type } }));
        } else if (type === 'CUSTOMER_UPDATED') {
          dispatch(customerUpdated(eventData as Customer));
          dispatch(fetchCustomersAction());
          dispatch(fetchUsersAction());
          window.dispatchEvent(new CustomEvent('titan:sse_event', { detail: { data: eventData, type } }));
        } else if (type === 'NO_OPTOMETRIST_AVAILABLE' || type === 'OPTOMETRIST_NO_RESPONSE') {
          const payload = eventData as NoOptometristEventPayload;
          const currentUser = userRef.current;
          const isMatchingStore =
            currentUser?.role === 'store' &&
            !!currentUser.storeName &&
            !!payload.storeName &&
            currentUser.storeName.toLowerCase() === payload.storeName.toLowerCase();

          if (type === 'NO_OPTOMETRIST_AVAILABLE' && currentUser?.role === 'admin') {
            addLogNotification({
              description: `${payload.storeName || 'A store'} requested an Optometrist for ${payload.customerName}, but no Optometrist are currently available.`,
              title: 'No Optometrists Available',
              type: 'no_optometrist_available',
            });
          } else if (isMatchingStore) {
            addLogNotification({
              customerId: payload.customerId,
              description:
                type === 'NO_OPTOMETRIST_AVAILABLE'
                  ? 'Optometrists are currently busy. Please try again.'
                  : `No Optometrists answered your request for ${payload.customerName}.`,
              title:
                type === 'NO_OPTOMETRIST_AVAILABLE' ? 'Optometrist Unavailable' : 'No Optometrist Answered',
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
          window.dispatchEvent(new CustomEvent('titan:sse_event', { detail: { data: parsed.data, type } }));
        } else if (type === 'TVMODE_VIDEO_CHANGED') {
          window.dispatchEvent(new CustomEvent('titan:tvmode_video_changed', { detail: eventData }));
        } else if (type === 'CALL_SESSION_READY' || type === 'CALL_SESSION_ENDED') {
          window.dispatchEvent(new CustomEvent('titan:sse_event', { detail: { data: parsed.data, type } }));
          window.dispatchEvent(
            new CustomEvent(
              type === 'CALL_SESSION_READY' ? 'titan:call_session_ready' : 'titan:call_session_ended',
              {
                detail: parsed.data,
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
