import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  getDocs 
} from 'firebase/firestore';
import { Booking, Vehicle, Driver, Approver, Caretaker, DepartmentHead } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test completed.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Clean fields with undefined values to prevent Firestore serialization crashes
export function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj as object)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned;
  }
  return obj;
}

// Firestore operations standard helpers

export async function saveVehicleToFirestore(vehicle: Vehicle) {
  const path = `vehicles/${vehicle.id}`;
  try {
    await setDoc(doc(db, 'vehicles', vehicle.id), cleanForFirestore(vehicle));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteVehicleFromFirestore(id: string) {
  const path = `vehicles/${id}`;
  try {
    await deleteDoc(doc(db, 'vehicles', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveDriverToFirestore(driver: Driver) {
  const path = `drivers/${driver.id}`;
  try {
    await setDoc(doc(db, 'drivers', driver.id), cleanForFirestore(driver));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteDriverFromFirestore(id: string) {
  const path = `drivers/${id}`;
  try {
    await deleteDoc(doc(db, 'drivers', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveBookingToFirestore(booking: Booking) {
  const path = `bookings/${booking.id}`;
  try {
    await setDoc(doc(db, 'bookings', booking.id), cleanForFirestore(booking));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteBookingFromFirestore(id: string) {
  const path = `bookings/${id}`;
  try {
    await deleteDoc(doc(db, 'bookings', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveApproverToFirestore(approver: Approver) {
  const path = `approvers/${approver.id}`;
  try {
    await setDoc(doc(db, 'approvers', approver.id), cleanForFirestore(approver));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteApproverFromFirestore(id: string) {
  const path = `approvers/${id}`;
  try {
    await deleteDoc(doc(db, 'approvers', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveCaretakerToFirestore(caretaker: Caretaker) {
  const path = `caretakers/${caretaker.id}`;
  try {
    await setDoc(doc(db, 'caretakers', caretaker.id), cleanForFirestore(caretaker));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCaretakerFromFirestore(id: string) {
  const path = `caretakers/${id}`;
  try {
    await deleteDoc(doc(db, 'caretakers', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveDepartmentHeadToFirestore(head: DepartmentHead) {
  const path = `departmentHeads/${head.id}`;
  try {
    await setDoc(doc(db, 'departmentHeads', head.id), cleanForFirestore(head));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteDepartmentHeadFromFirestore(id: string) {
  const path = `departmentHeads/${id}`;
  try {
    await deleteDoc(doc(db, 'departmentHeads', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Watchers
export function watchVehicles(callback: (vehicles: Vehicle[]) => void) {
  return onSnapshot(collection(db, 'vehicles'), (snapshot) => {
    const list: Vehicle[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Vehicle);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'vehicles');
  });
}

export function watchDrivers(callback: (drivers: Driver[]) => void) {
  return onSnapshot(collection(db, 'drivers'), (snapshot) => {
    const list: Driver[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Driver);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'drivers');
  });
}

export function watchBookings(callback: (bookings: Booking[]) => void) {
  return onSnapshot(collection(db, 'bookings'), (snapshot) => {
    const list: Booking[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Booking);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'bookings');
  });
}

export function watchApprovers(callback: (approvers: Approver[]) => void) {
  return onSnapshot(collection(db, 'approvers'), (snapshot) => {
    const list: Approver[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Approver);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'approvers');
  });
}

export function watchCaretakers(callback: (caretakers: Caretaker[]) => void) {
  return onSnapshot(collection(db, 'caretakers'), (snapshot) => {
    const list: Caretaker[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Caretaker);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'caretakers');
  });
}

export function watchDepartmentHeads(callback: (heads: DepartmentHead[]) => void) {
  return onSnapshot(collection(db, 'departmentHeads'), (snapshot) => {
    const list: DepartmentHead[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as DepartmentHead);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'departmentHeads');
  });
}

// Initial upload of existing / localStorage data to Firestore if completely empty
export async function bootstrapFirestoreIfEmpty(
  localBookings: Booking[],
  localVehicles: Vehicle[],
  localDrivers: Driver[],
  localApprovers: Approver[],
  localCaretakers: Caretaker[],
  localDepartmentHeads: DepartmentHead[] = []
) {
  try {
    // Check bookings collection
    const bookingsSn = await getDocs(collection(db, 'bookings'));
    if (bookingsSn.empty) {
      console.log('Bootstrapping bookings collection into Firestore...');
      for (const b of localBookings) {
        await saveBookingToFirestore(b);
      }
    }
    
    // Check vehicles collection
    const vehiclesSn = await getDocs(collection(db, 'vehicles'));
    if (vehiclesSn.empty) {
      console.log('Bootstrapping vehicles collection into Firestore...');
      for (const v of localVehicles) {
        await saveVehicleToFirestore(v);
      }
    }

    // Check drivers collection
    const driversSn = await getDocs(collection(db, 'drivers'));
    if (driversSn.empty) {
      console.log('Bootstrapping drivers collection into Firestore...');
      for (const d of localDrivers) {
        await saveDriverToFirestore(d);
      }
    }

    // Check approvers collection
    const approversSn = await getDocs(collection(db, 'approvers'));
    if (approversSn.empty) {
      console.log('Bootstrapping approvers collection into Firestore...');
      for (const a of localApprovers) {
        await saveApproverToFirestore(a);
      }
    }

    // Check caretakers collection
    const caretakersSn = await getDocs(collection(db, 'caretakers'));
    if (caretakersSn.empty) {
      console.log('Bootstrapping caretakers collection into Firestore...');
      for (const c of localCaretakers) {
        await saveCaretakerToFirestore(c);
      }
    }

    // Check departmentHeads collection
    const deptHeadsSn = await getDocs(collection(db, 'departmentHeads'));
    if (deptHeadsSn.empty) {
      console.log('Bootstrapping departmentHeads collection into Firestore...');
      for (const h of localDepartmentHeads) {
        await saveDepartmentHeadToFirestore(h);
      }
    }
  } catch (error) {
    console.error('Failed to bootstrap local data onto Firestore:', error);
  }
}
