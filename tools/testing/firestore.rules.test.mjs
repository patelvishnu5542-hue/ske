// Security rules tests. Run from tools/testing: npm run test:rules (starts the Firestore emulator).
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, collection, query, where, serverTimestamp,
} from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ske-rules',
    firestore: { rules: readFileSync(new URL('../../ske/firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});

after(() => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'admins/admin-uid'), { role: 'admin' });
    await setDoc(doc(db, 'products/p1'), { name: 'Panel', isActive: true });
    await setDoc(doc(db, 'reviews/r1'), { name: 'A', status: 'approved' });
    await setDoc(doc(db, 'leads/l1'), { name: 'Asha', phone: '9829500000', status: 'new' });
    await setDoc(doc(db, 'media/m1'), { data: 'data:image/webp;base64,AAAA' });
  });
});

const visitor = () => env.unauthenticatedContext().firestore();
// Any account at all, e.g. one created through open sign-up. Must NOT be an admin.
const stranger = () => env.authenticatedContext('stranger-uid', { email: 'someone@example.com', email_verified: true }).firestore();
const admin = () => env.authenticatedContext('admin-uid').firestore();

const lead = (overrides = {}) => ({
  name: 'Ramesh Kumar',
  phone: '+91 98290 00000',
  message: 'Need a 5 kW rooftop system',
  source: 'Homepage quote form',
  status: 'new',
  createdAt: serverTimestamp(),
  ...overrides,
});

test('visitors can read the public catalogue', async () => {
  await assertSucceeds(getDoc(doc(visitor(), 'products/p1')));
  await assertSucceeds(getDocs(query(collection(visitor(), 'products'), where('isActive', '==', true))));
  await assertSucceeds(getDocs(query(collection(visitor(), 'reviews'), where('status', '==', 'approved'))));
  await assertSucceeds(getDoc(doc(visitor(), 'media/m1')));
});

test('visitors cannot change the catalogue', async () => {
  await assertFails(setDoc(doc(visitor(), 'products/p2'), { name: 'Fake' }));
  await assertFails(updateDoc(doc(visitor(), 'products/p1'), { name: 'Hacked' }));
  await assertFails(deleteDoc(doc(visitor(), 'products/p1')));
  await assertFails(setDoc(doc(visitor(), 'media/m2'), { data: 'x' }));
});

test('a signed-in account that is not on the admin list has no admin rights', async () => {
  const db = stranger();
  await assertFails(updateDoc(doc(db, 'products/p1'), { name: 'Hacked' }));
  await assertFails(deleteDoc(doc(db, 'products/p1')));
  await assertFails(setDoc(doc(db, 'gallery/g1'), { caption: 'x' }));
  await assertFails(setDoc(doc(db, 'hero_slides/h1'), { title: 'x' }));
  await assertFails(deleteDoc(doc(db, 'reviews/r1')));
  await assertFails(getDoc(doc(db, 'leads/l1')));
  await assertFails(getDocs(collection(db, 'leads')));
  await assertFails(deleteDoc(doc(db, 'media/m1')));
});

test('accounts cannot add themselves to the admin list', async () => {
  await assertFails(setDoc(doc(stranger(), 'admins/stranger-uid'), { role: 'admin' }));
  await assertFails(setDoc(doc(admin(), 'admins/stranger-uid'), { role: 'admin' }));
  await assertFails(getDoc(doc(stranger(), 'admins/admin-uid')));
  await assertSucceeds(getDoc(doc(admin(), 'admins/admin-uid')));
  await assertSucceeds(getDoc(doc(stranger(), 'admins/stranger-uid')));
});

test('admins can manage content, media and leads', async () => {
  const db = admin();
  await assertSucceeds(updateDoc(doc(db, 'products/p1'), { name: 'Updated' }));
  await assertSucceeds(setDoc(doc(db, 'gallery/g1'), { caption: 'Roof', isActive: true }));
  await assertSucceeds(setDoc(doc(db, 'media/m2'), { data: 'data:image/webp;base64,BBBB' }));
  await assertSucceeds(deleteDoc(doc(db, 'media/m2')));
  await assertSucceeds(getDocs(collection(db, 'leads')));
  await assertSucceeds(updateDoc(doc(db, 'leads/l1'), { status: 'contacted' }));
  await assertSucceeds(deleteDoc(doc(db, 'leads/l1')));
});

test('anyone can submit a valid lead, but nobody except admins can read leads back', async () => {
  await assertSucceeds(addDoc(collection(visitor(), 'leads'), lead()));
  const { message, ...noMessage } = lead();
  await assertSucceeds(addDoc(collection(visitor(), 'leads'), noMessage));
  await assertFails(getDocs(collection(visitor(), 'leads')));
  await assertFails(getDoc(doc(visitor(), 'leads/l1')));
});

test('invalid or abusive leads are rejected', async () => {
  const leads = collection(visitor(), 'leads');
  await assertFails(addDoc(leads, lead({ name: 'A' })));
  await assertFails(addDoc(leads, lead({ name: 'x'.repeat(81) })));
  await assertFails(addDoc(leads, lead({ phone: 'call me maybe' })));
  await assertFails(addDoc(leads, lead({ phone: '<img src=x onerror=alert(1)>' })));
  await assertFails(addDoc(leads, lead({ message: 'x'.repeat(1001) })));
  await assertFails(addDoc(leads, lead({ status: 'contacted' })));
  await assertFails(addDoc(leads, lead({ createdAt: new Date('2020-01-01') })));
  await assertFails(addDoc(leads, lead({ isAdmin: true })));
  const { phone, ...noPhone } = lead();
  await assertFails(addDoc(leads, noPhone));
});

test('visitors cannot edit or delete existing leads', async () => {
  await assertFails(updateDoc(doc(visitor(), 'leads/l1'), { status: 'contacted' }));
  await assertFails(deleteDoc(doc(visitor(), 'leads/l1')));
});

test('admins can only change the status of a lead', async () => {
  await assertFails(updateDoc(doc(admin(), 'leads/l1'), { phone: '0000000000' }));
  await assertFails(updateDoc(doc(admin(), 'leads/l1'), { status: 'spam' }));
});

test('media documents can never be edited in place', async () => {
  await assertFails(updateDoc(doc(admin(), 'media/m1'), { data: 'data:image/webp;base64,CCCC' }));
});

test('collections not listed in the rules are denied', async () => {
  await assertFails(setDoc(doc(admin(), 'secrets/x'), { a: 1 }));
  await assertFails(getDoc(doc(visitor(), 'secrets/x')));
});
