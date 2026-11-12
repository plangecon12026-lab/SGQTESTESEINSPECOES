'use client';
import {browserContract,contractFetch} from './contract-client';


import type { FormData as SGQFormData } from './sgq-model';
import type { ReportData } from './report-types';
import { uploadSGQPhoto } from './sgq-photo-upload';

const DB_NAME = 'sgq-offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'queue';
const DRAFT_STORE = 'drafts';

export type StoredPhoto = { id: string; file: File; preview?: string };

export type SGQQueueItem = {
  id: string;
  type: 'sgq';
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastError?: string;
  payload: { id: string; kind: string; data: SGQFormData; revision?: number; photos: StoredPhoto[] };
};

export type EngineeringQueueItem = {
  id: string;
  type: 'engineering';
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastError?: string;
  reservation?: { id: string; reportNumber: string };
  payload: {
    report: ReportData;
    issuer: { key: string; name: string; role: string };
    year: number;
  };
};

export type OfflineQueueItem = SGQQueueItem | EngineeringQueueItem;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(browserContract()==='s11d'?DB_NAME:DB_NAME+'-'+browserContract(), DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeRequest<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = action(tx.objectStore(storeName));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = () => { db.close(); reject(tx.error || request.error || new Error('Falha ao guardar os dados neste aparelho.')); };
    tx.onerror = () => { /* onabort reports the failed transaction */ };
  });
}

function queueChanged() {
  window.dispatchEvent(new CustomEvent('sgq-offline-queue-changed'));
}

export async function putQueue(item: OfflineQueueItem) {
  await storeRequest(QUEUE_STORE, 'readwrite', store => store.put(item));
  queueChanged();
}

export async function getQueue(): Promise<OfflineQueueItem[]> {
  return storeRequest(QUEUE_STORE, 'readonly', store => store.getAll());
}

export async function deleteQueue(id: string) {
  await storeRequest(QUEUE_STORE, 'readwrite', store => store.delete(id));
  queueChanged();
}

export async function putDraft<T>(key: string, value: T) {
  await storeRequest(DRAFT_STORE, 'readwrite', store => store.put(value, key));
}

export async function getDraft<T>(key: string): Promise<T | undefined> {
  return storeRequest(DRAFT_STORE, 'readonly', store => store.get(key)) as Promise<T | undefined>;
}

export async function deleteDraft(key: string) {
  await storeRequest(DRAFT_STORE, 'readwrite', store => store.delete(key));
}

async function uploadSGQPhotos(item: SGQQueueItem) {
  let data = item.payload.data;
  for (const photo of item.payload.photos) {
    const url = await uploadSGQPhoto(photo.file);
    data = { ...data, photos: data.photos.map(entry => entry.url === `offline:${photo.id}` ? { ...entry, url } : entry) };
    item = { ...item, updatedAt: new Date().toISOString(), payload: { ...item.payload, data, photos: item.payload.photos.filter(entry => entry.id !== photo.id) } };
    await putQueue(item);
  }
  if (data.photos.some(photo => photo.url.startsWith('offline:'))) throw new Error('Uma foto guardada neste aparelho não está disponível. O relatório foi mantido para conferência.');
  return data;
}

async function syncSGQ(item: SGQQueueItem) {
  const uploadedData = await uploadSGQPhotos(item);
  const previousClient = uploadedData.common.client?.trim() || '';
  const isVale = previousClient.toLocaleLowerCase('pt-BR') === 'vale';
  const data = {
    ...uploadedData,
    common: {
      ...uploadedData.common,
      client: previousClient === 'Outro' ? 'Outro' : isVale || !previousClient ? 'Vale' : 'Outro',
      clientOther: previousClient === 'Outro' ? uploadedData.common.clientOther || '' : isVale || !previousClient ? uploadedData.common.clientOther || '' : previousClient,
      ...(item.payload.kind === 'torque' ? { service: 'Conferência de torque' } : {}),
    },
  };
  const response = await contractFetch('/api/sgq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: item.payload.id, kind: item.payload.kind, data, ...(item.payload.revision === undefined ? {} : { revision: item.payload.revision }) }),
  });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error || 'Falha ao sincronizar a inspeção.');
}

function prepareEngineeringReport(report: ReportData): ReportData {
  return {
    ...report,
    situacoes: report.situacoes.map(situation => ({
      ...situation,
      fotos: situation.fotos.map(photo => ({ ...photo, preview: URL.createObjectURL(photo.file) })),
    })),
  };
}

function engineeringMetadata(report: ReportData) {
  return {
    ...report,
    situacoes: report.situacoes.map(situation => ({
      ...situation,
      fotos: situation.fotos.map(photo => ({ id: photo.id, legenda: photo.legenda, nome: photo.file.name, tipo: photo.file.type, tamanho: photo.file.size })),
    })),
  };
}

async function syncEngineering(item: EngineeringQueueItem) {
  let reservation = item.reservation;
  const baseReport = prepareEngineeringReport(item.payload.report);
  const metadata = engineeringMetadata(baseReport);
  if (!reservation) {
    const response = await contractFetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issuerKey: item.payload.issuer.key, issuerName: item.payload.issuer.name, issuerRole: item.payload.issuer.role, year: item.payload.year, manualSequence: baseReport.cabecalho.manualSequence, metadata }),
    });
    const result = await response.json() as { id?: string; reportNumber?: string; error?: string };
    if (!response.ok || !result.id || !result.reportNumber) throw new Error(result.error || 'Falha ao gerar a numeração.');
    reservation = { id: result.id, reportNumber: result.reportNumber };
    await putQueue({ ...item, reservation, updatedAt: new Date().toISOString() });
  }

  const report = { ...baseReport, cabecalho: { ...baseReport.cabecalho, numeroContratada: reservation.reportNumber } };
  const [{ generateDocx }, { generatePdf }] = await Promise.all([import('./generate-docx'), import('./generate-pdf')]);
  const docx = await generateDocx(report);
  let pdf: Awaited<ReturnType<typeof generatePdf>> | null = null;
  try { pdf = await generatePdf(report); } catch { pdf = null; }
  const form = new FormData();
  form.append('id', reservation.id);
  form.append('metadata', JSON.stringify({ ...engineeringMetadata(report), cabecalho: report.cabecalho }));
  form.append('docx', docx.blob, docx.filename);
  if (pdf) form.append('pdf', pdf.blob, pdf.filename);
  const response = await contractFetch('/api/reports', { method: 'PUT', body: form });
  if (!response.ok) throw new Error('Falha ao enviar o relatório de engenharia.');
}

let syncing = false;
export async function syncOfflineQueue(onProgress?: (done: number, total: number) => void) {
  if (syncing || !navigator.onLine) return { synced: 0, pending: (await getQueue()).length, errors: 0 };
  syncing = true;
  let synced = 0;
  let errors = 0;
  try {
    const items = (await getQueue()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const item of items) {
      try {
        if (item.type === 'sgq') await syncSGQ(item);
        else await syncEngineering(item);
        await deleteQueue(item.id);
        synced += 1;
      } catch (error) {
        errors += 1;
        // Read the latest copy: engineering reports may have reserved a number before an upload failed.
        const saved = (await getQueue()).find(current => current.id === item.id) || item;
        await putQueue({ ...saved, attempts: saved.attempts + 1, updatedAt: new Date().toISOString(), lastError: error instanceof Error ? error.message : 'Falha na sincronização.' });
      }
      onProgress?.(synced + errors, items.length);
    }
  } finally {
    syncing = false;
  }
  if (synced > 0) window.dispatchEvent(new CustomEvent('sgq-offline-synced', { detail: { synced } }));
  return { synced, pending: (await getQueue()).length, errors };
}
