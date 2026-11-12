'use client';

import { useEffect, useState } from 'react';
import { getQueue, syncOfflineQueue } from './offline-store';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const refreshQueue = () => { void getQueue().then(items => { setPending(items.length); setSyncError(items.find(item => item.lastError)?.lastError || ''); }).catch(() => undefined); };
  const runSync = async () => {
      setOnline(true);
      setSyncing(true);
      setSyncMessage('');
      try {
        const queued = await getQueue();
        setPending(queued.length);
        if (!queued.length) return;
        const result = await syncOfflineQueue();
        const remaining = await getQueue();
        setPending(remaining.length);
        setSyncError(remaining.find(item => item.lastError)?.lastError || '');
        setSyncMessage(result.pending ? 'Envio pendente. Confira o motivo abaixo e tente novamente.' : `${result.synced} item(ns) sincronizado(s)`);
        if (!result.pending) window.setTimeout(() => setSyncMessage(''), 5000);
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : 'Falha na sincronização. Os relatórios continuam guardados neste aparelho.');
        refreshQueue();
      } finally { setSyncing(false); }
    };
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    setOnline(navigator.onLine);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    let checkForUpdate: (() => void) | undefined;
    let handleControllerChange: (() => void) | undefined;
    if ('serviceWorker' in navigator) {
      const hadController = Boolean(navigator.serviceWorker.controller);
      handleControllerChange = () => { if (hadController) setUpdateAvailable(true); };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => {
        checkForUpdate = () => { if (document.visibilityState === 'visible' && navigator.onLine) void registration.update().catch(() => undefined); };
        document.addEventListener('visibilitychange', checkForUpdate);
        checkForUpdate();
      }).catch(() => undefined);
    }

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstalled(false);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    const handleOnline = () => { void runSync(); };
    const handleOffline = () => setOnline(false);

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sgq-offline-queue-changed', refreshQueue);
    refreshQueue();
    if (navigator.onLine) void runSync();
    return () => {
      if (checkForUpdate) document.removeEventListener('visibilitychange', checkForUpdate);
      if (handleControllerChange) navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sgq-offline-queue-changed', refreshQueue);
    };
  }, []);

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setInstallPrompt(null);
      return;
    }
    if (isIOS) setShowIOSHelp(true);
  }

  const canInstall = !installed && (Boolean(installPrompt) || isIOS);

  return <>
    {updateAvailable && <button type="button" className="pwa-update-button" onClick={() => window.location.reload()}>Nova versão do SGQ disponível · toque para atualizar</button>}
    {!online && <div className="pwa-offline" role="status">
      <span>Sem internet</span>
      <p>Continue preenchendo normalmente. O aplicativo guardará tudo neste aparelho.</p>
    </div>}
    {(pending > 0 || syncing || syncMessage) && <button className={'offline-sync-status '+(pending ? 'pending' : 'done')} onClick={() => { if (navigator.onLine && !syncing) void runSync(); }}>
      <span>{syncing ? '↻' : pending ? '◷' : '✓'}</span>
      <b>{syncing ? 'Sincronizando…' : pending ? `${pending} pendente(s) de envio` : syncMessage}</b>
      {pending > 0 && <small>{syncError || (online ? 'Toque para tentar novamente' : 'O envio recomeça quando a internet voltar')}</small>}
    </button>}
    {canInstall && <button className="pwa-install-button" onClick={install} aria-label="Instalar aplicativo SGQ">
      <img src="/icons/sgq-192.png" alt="" />
      <span><b>Instalar SGQ</b><small>Adicionar ao celular</small></span>
      <strong>↓</strong>
    </button>}
    {showIOSHelp && <div className="pwa-guide-backdrop" role="presentation" onClick={() => setShowIOSHelp(false)}>
      <section className="pwa-guide" role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title" onClick={event => event.stopPropagation()}>
        <button className="pwa-guide-close" onClick={() => setShowIOSHelp(false)} aria-label="Fechar">×</button>
        <img src="/icons/sgq-192.png" alt="Mascote SGQ" />
        <h2 id="pwa-guide-title">Instalar SGQ no iPhone</h2>
        <ol>
          <li>Abra este site pelo <b>Safari</b>.</li>
          <li>Toque em <b>Compartilhar</b> <span aria-hidden="true">▱↑</span>.</li>
          <li>Escolha <b>Adicionar à Tela de Início</b>.</li>
          <li>Confirme em <b>Adicionar</b>.</li>
        </ol>
        <button className="pwa-guide-ok" onClick={() => setShowIOSHelp(false)}>Entendi</button>
      </section>
    </div>}
  </>;
}
