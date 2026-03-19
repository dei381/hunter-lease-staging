import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

// Simple session ID generator
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

// Simple visitor ID generator (persists across sessions)
const getVisitorId = () => {
  let visitorId = localStorage.getItem('visitorId');
  if (!visitorId) {
    visitorId = `vis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('visitorId', visitorId);
    
    // Log new unique visitor
    try {
      addDoc(collection(db, 'analytics_visitors'), {
        visitorId,
        firstVisit: serverTimestamp(),
        userAgent: navigator.userAgent,
        language: navigator.language
      });
    } catch (e) {
      console.error('Failed to log visitor', e);
    }
  }
  return visitorId;
};

export function VisitTracker() {
  const location = useLocation();

  useEffect(() => {
    const sessionId = getSessionId();
    const visitorId = getVisitorId();
    const startTime = Date.now();
    const path = location.pathname + location.search;
    let docId: string | null = null;

    const trackVisit = async () => {
      try {
        const docRef = await addDoc(collection(db, 'visits'), {
          sessionId,
          visitorId,
          path,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          timestamp: serverTimestamp(),
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          language: navigator.language,
          duration: 0
        });
        docId = docRef.id;
      } catch (error) {
        if (error instanceof Error && (error.message.includes('insufficient permissions') || error.message.includes('PERMISSION_DENIED'))) {
          handleFirestoreError(error, OperationType.CREATE, 'visits');
        } else {
          console.error('Failed to track visit:', error);
        }
      }
    };

    trackVisit();

    return () => {
      // Update duration when leaving the page
      if (docId) {
        const duration = Math.round((Date.now() - startTime) / 1000); // in seconds
        try {
          updateDoc(doc(db, 'visits', docId), {
            duration
          });
        } catch (e) {
          console.error('Failed to update pageview duration', e);
        }
      }
    };
  }, [location]);

  return null;
}

// Helper to log specific events (clicks, funnel steps)
export const logEvent = async (eventName: string, eventData: any = {}) => {
  try {
    await addDoc(collection(db, 'analytics_events'), {
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      eventName,
      eventData,
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.error('Failed to log event', e);
  }
};
