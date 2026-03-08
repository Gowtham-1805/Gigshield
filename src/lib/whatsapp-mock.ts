import { toast } from 'sonner';

interface WhatsAppNotification {
  type: 'claim_created' | 'claim_approved' | 'payout_sent' | 'weather_alert';
  amount?: number;
  triggerType?: string;
  workerName?: string;
}

const notificationTemplates = {
  claim_created: (data: WhatsAppNotification) => ({
    title: '📱 WhatsApp Notification Sent',
    description: `"GigShield: Your ${data.triggerType?.replace('_', ' ')} claim for ₹${data.amount} has been submitted. Track status in-app."`,
  }),
  claim_approved: (data: WhatsAppNotification) => ({
    title: '📱 WhatsApp Notification Sent',
    description: `"GigShield: Great news ${data.workerName}! Your claim for ₹${data.amount} is APPROVED. Payout processing..."`,
  }),
  payout_sent: (data: WhatsAppNotification) => ({
    title: '📱 WhatsApp Notification Sent',
    description: `"GigShield: ₹${data.amount} credited to your UPI! Transaction complete. Stay safe! 🛡️"`,
  }),
  weather_alert: (data: WhatsAppNotification) => ({
    title: '📱 WhatsApp Alert Sent',
    description: `"GigShield: ⚠️ ${data.triggerType?.replace('_', ' ')} detected in your zone. Your coverage is ACTIVE. Stay safe!"`,
  }),
};

export function sendMockWhatsAppNotification(notification: WhatsAppNotification) {
  const template = notificationTemplates[notification.type](notification);
  
  // Simulate network delay
  setTimeout(() => {
    toast.success(template.title, {
      description: template.description,
      duration: 5000,
      icon: '💬',
      style: {
        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
        color: 'white',
        border: 'none',
      },
    });
  }, 800);
}

export function sendMockWhatsAppClaimCreated(amount: number, triggerType: string) {
  sendMockWhatsAppNotification({ type: 'claim_created', amount, triggerType });
}

export function sendMockWhatsAppApproved(workerName: string, amount: number) {
  sendMockWhatsAppNotification({ type: 'claim_approved', workerName, amount });
}

export function sendMockWhatsAppPayout(amount: number) {
  sendMockWhatsAppNotification({ type: 'payout_sent', amount });
}

export function sendMockWhatsAppWeatherAlert(triggerType: string) {
  sendMockWhatsAppNotification({ type: 'weather_alert', triggerType });
}
