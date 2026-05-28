import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Booking, Driver, Vehicle } from '../types';

// Initialize Firebase once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Calendar scopes
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

// In-memory state
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    // Also save in session (soft-storage for refresh, but guidelines say in-memory caching is preferred without localStorage/sessionStorage)
    // We strictly adhere to "Do NOT store the access token in localStorage or sessionStorage. Use in-memory caching"
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Creates an event in Google Calendar for an approved booking
 */
export const syncBookingToGoogleCalendar = async (
  booking: Booking,
  vehicle: Vehicle | undefined,
  driver: Driver | undefined | { name: string; phone: string },
  accessToken: string
): Promise<any> => {
  const driverName = driver?.name || 'รอมอบหมาย';
  const driverPhone = driver?.phone || 'ไม่ระบุ';
  const vehicleName = vehicle?.name || 'ไม่ระบุชนิด';
  const vehiclePlate = vehicle?.plateNumber || 'ยังไม่กำหนดทะเบียน';

  const description = `
เลขใบขออนุญาต: ${booking.permitNumber}
กลุ่มฝ่าย: ${booking.department}
ผู้ขออนุญาตใช้รถ: ${booking.requesterName} (${booking.requesterPosition})
จุดหมาย: ${booking.destination}
วัตถุประสงค์: ${booking.purpose}
จำนวนผู้โดยสาร: ${booking.passengersCount} คน
พนักงานขับรถควบคุม: ${driverName} (${driverPhone})
ยานพาหนะจัดสรร: ${vehicleName} (หมายเลขทะเบียน ${vehiclePlate})
ผู้อนุมัติความประสงค์: ${booking.approvedBy} (${booking.approvedByPosition})
พิมพ์ระบบ พมจ.ตรัง
  `.trim();

  // Construct ISO DateTime strings
  const startDateTime = new Date(booking.startDate).toISOString();
  const endDateTime = new Date(booking.endDate).toISOString();

  const eventPayload = {
    summary: `[อนุมัติใช้รถ] ${booking.destination} - ทะเบียน ${vehiclePlate}`,
    location: booking.destination,
    description: description,
    start: {
      dateTime: startDateTime,
      timeZone: 'Asia/Bangkok',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'Asia/Bangkok',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 120 }
      ],
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('Google Calendar error detail:', errData);
    throw new Error(errData?.error?.message || `HTTP error ${response.status}`);
  }

  return await response.json();
};
