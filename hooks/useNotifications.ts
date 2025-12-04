
import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus } from '../types';

type NotificationPermission = 'default' | 'granted' | 'denied';

const NOTIFICATION_CHECK_INTERVAL = 60000; // 1 minute
const REMINDER_THRESHOLD = 15 * 60 * 1000; // 15 minutes

export const useNotifications = (tasks: Task[]) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize Audio with a user-friendly sound
    const sound = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV-CQAEAC4A75990AAAAANIAAAEAAAD0QAAAQAAMQ==';
    notificationAudioRef.current = new Audio(sound);
    notificationAudioRef.current.load();

    // AUDIO UNLOCK STRATEGY:
    // Browsers block audio context until a user gesture. We hook into ANY click/touch
    // on the document to play a tiny fraction of the sound (muted), unlocking the
    // ability to play it louder later when a notification actually fires.
    const unlockAudio = () => {
        if (notificationAudioRef.current) {
            const originalVolume = notificationAudioRef.current.volume;
            notificationAudioRef.current.volume = 0; // Mute for unlock
            const playPromise = notificationAudioRef.current.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Immediately pause and reset
                    if (notificationAudioRef.current) {
                        notificationAudioRef.current.pause();
                        notificationAudioRef.current.currentTime = 0;
                        notificationAudioRef.current.volume = originalVolume; // Restore volume
                    }
                }).catch(error => {
                    // Auto-play prevented, will try again next click
                    console.debug("Audio unlock prevented, retrying on next interaction.");
                });
            }
        }
        // Remove listeners once unlocked (or tried to)
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission as NotificationPermission);
      
      // Attempt to request if default, but only on user interaction contexts ideally.
      // We check if we can just ask immediately (some browsers allow it on load, others block).
      if (Notification.permission === 'default') {
          // We don't force request here to avoid annoyance, relying on the wizard or user action.
      }
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('Browser ini tidak mendukung notifikasi desktop.');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      // If granted, test the audio immediately to confirm it works
      if (result === 'granted' && notificationAudioRef.current) {
          notificationAudioRef.current.play().catch(e => console.warn("Test audio failed", e));
      }
    } catch (error) {
        console.error("Gagal meminta izin notifikasi:", error);
    }
  }, []);

  useEffect(() => {
    if (permission !== 'granted') {
      return;
    }

    const checkTasksAndNotify = () => {
      const now = new Date().getTime();
      const audio = notificationAudioRef.current;

      tasks.forEach(task => {
        if (task.status === TaskStatus.Done) return;

        const endTime = new Date(task.endTime).getTime();
        const timeUntilEnd = endTime - now;
        
        // Overdue notification
        // Logic: If time is negative (past) AND we haven't notified yet
        const overdueKey = `notified-overdue-${task.id}`;
        // Check local storage to prevent spamming every minute
        const alreadyNotifiedOverdue = localStorage.getItem(overdueKey);

        if (timeUntilEnd < 0 && !alreadyNotifiedOverdue) {
          try {
              new Notification('Tugas Terlewat!', {
                body: `Tugas "${task.title}" sudah melewati batas waktu.`,
                icon: '/icon.svg',
                tag: task.id // Replace existing notifs for same task
              });
              
              if (audio) {
                  audio.currentTime = 0;
                  audio.play().catch(e => console.warn("Pemutaran audio notifikasi gagal (kebijakan browser):", e));
              }
              
              localStorage.setItem(overdueKey, 'true');
          } catch (e) {
              console.error("Gagal menampilkan notifikasi overdue:", e);
          }
        }
        
        // Reminder notification (15 mins before)
        const reminderKey = `notified-reminder-${task.id}`;
        const alreadyNotifiedReminder = localStorage.getItem(reminderKey);

        if (timeUntilEnd > 0 && timeUntilEnd <= REMINDER_THRESHOLD && !alreadyNotifiedReminder) {
           try {
               new Notification('Pengingat Tugas', {
                body: `Tugas "${task.title}" akan berakhir dalam 15 menit.`,
                icon: '/icon.svg',
                tag: task.id
              });
              
              if (audio) {
                  audio.currentTime = 0;
                  audio.play().catch(e => console.warn("Pemutaran audio notifikasi gagal:", e));
              }
              
              localStorage.setItem(reminderKey, 'true');
           } catch (e) {
               console.error("Gagal menampilkan notifikasi reminder:", e);
           }
        }
      });
    };

    // Initial check
    checkTasksAndNotify();

    // Interval check
    const intervalId = setInterval(checkTasksAndNotify, NOTIFICATION_CHECK_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [tasks, permission]);

  return { notificationPermission: permission, requestNotificationPermission: requestPermission };
};
