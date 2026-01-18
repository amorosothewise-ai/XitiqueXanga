import { Xitique, Notification, XitiqueType, XitiqueStatus } from '../types';
import { getXitiques } from './storage';
import { formatCurrency } from './formatUtils';
import { calculateCyclePot, calculateBalance } from './financeLogic';

const NOTIF_STORAGE_KEY = 'xitique_notifications_v1';

export const getNotifications = (): Notification[] => {
  const data = localStorage.getItem(NOTIF_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveNotifications = (notifications: Notification[]): void => {
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications));
};

export const markNotificationRead = (id: string): Notification[] => {
  const current = getNotifications();
  const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
  saveNotifications(updated);
  return updated;
};

/**
 * Pure function to generate notifications based on state.
 * @param xitiques List of all xitiques
 * @param existingIds Set of notification IDs already generated to prevent duplicates
 * @param referenceDate The "current" date (defaults to now)
 */
export const generateNotificationsLogic = (
  xitiques: Xitique[], 
  existingIds: Set<string>,
  referenceDate: Date = new Date()
): Notification[] => {
  const newNotifications: Notification[] = [];

  xitiques.forEach(x => {
    if (x.status === XitiqueStatus.ACTIVE || x.status === XitiqueStatus.PLANNING || x.status === XitiqueStatus.RISK) {
      
      // GROUP LOGIC
      if (x.type === XitiqueType.GROUP) {
        // Recalculate Pot based on active participants settings
        const currentCyclePot = calculateCyclePot(x.amount, x.participants);

        x.participants.forEach(p => {
          if (!p.received && p.payoutDate) {
            const pDate = new Date(p.payoutDate);
            // Reset time to start of day for accurate day diff comparison
            const pDateStart = new Date(pDate.setHours(0,0,0,0));
            const refDateStart = new Date(referenceDate.setHours(0,0,0,0));
            
            const diffTime = pDateStart.getTime() - refDateStart.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            const payoutAmountFormatted = formatCurrency(currentCyclePot);

            // 1. Contribution Reminder (2 days before)
            if (diffDays <= 2 && diffDays > 0) {
              const notifId = `contrib-${x.id}-${p.id}-${diffDays}`;
              if (!existingIds.has(notifId)) {
                 newNotifications.push({
                  id: notifId,
                  title: `Upcoming Rotation: ${p.name}`,
                  message: `Preparation time! The group needs to collect contributions for ${p.name} in ${diffDays} days.`,
                  date: referenceDate.toISOString(),
                  read: false,
                  type: 'info'
                });
                existingIds.add(notifId);
              }
            }

            // 2. Payout Due (Day 0)
            if (diffDays === 0) {
              const notifId = `payout-${x.id}-${p.id}`;
              if (!existingIds.has(notifId)) {
                newNotifications.push({
                  id: notifId,
                  title: `Payout Day: ${p.name}`,
                  message: `Today is the day! Please ensure ${p.name} receives ${payoutAmountFormatted}. Mark as paid when done.`,
                  date: referenceDate.toISOString(),
                  read: false,
                  type: 'success'
                });
                existingIds.add(notifId);
              }
            }

            // 3. Overdue (Negative)
            if (diffDays < 0 && diffDays > -30) {
               const baseOverdueId = `overdue-${x.id}-${p.id}`;
               
               if (!existingIds.has(baseOverdueId)) {
                newNotifications.push({
                  id: baseOverdueId,
                  title: `Attention: Overdue Payout`,
                  message: `${p.name} was scheduled to receive ${payoutAmountFormatted} on ${pDate.toLocaleDateString()}. Has this been settled?`,
                  date: referenceDate.toISOString(),
                  read: false,
                  type: 'warning'
                });
                existingIds.add(baseOverdueId);
               }
            }
          }
        });
      }

      // PERSONAL LOGIC
      if (x.type === XitiqueType.INDIVIDUAL) {
         const created = new Date(x.createdAt || Date.now());
         const diffCreated = Math.ceil((referenceDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
         
         // Use shared logic for balance calculation
         const currentBalance = calculateBalance(x.transactions || []);

         // Weekly encouragement
         if (diffCreated > 0 && diffCreated % 7 === 0 && currentBalance < (x.targetAmount || 1)) {
             const notifId = `ind-reminder-${x.id}-${diffCreated}`;
             if (!existingIds.has(notifId)) {
                 newNotifications.push({
                     id: notifId,
                     title: 'Savings Goal Reminder',
                     message: `It's been another week on your '${x.name}' goal. Keep going! Every Metical counts.`,
                     date: referenceDate.toISOString(),
                     read: false,
                     type: 'success'
                 });
                 existingIds.add(notifId);
             }
         }
      }
    }
  });

  return newNotifications;
};

export const checkAndGenerateNotifications = (): Notification[] => {
  const xitiques = getXitiques();
  const existingNotifications = getNotifications();
  
  const existingIds = new Set(existingNotifications.map(n => n.id));
  
  const generated = generateNotificationsLogic(xitiques, existingIds);
  
  if (generated.length > 0) {
      // Prepend new notifications
      const updated = [...generated, ...existingNotifications];
      saveNotifications(updated);
      return updated;
  }
  
  return existingNotifications;
};