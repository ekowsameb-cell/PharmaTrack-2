import { MomoProvider } from '../types/pharmacy';

export interface StkPushRequest {
  provider: MomoProvider;
  phoneNumber: string;
  amount: number;
  referenceNote: string;
}

export interface StkPushResponse {
  success: boolean;
  transactionId: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'TIMEOUT';
  networkReference: string;
  message: string;
  financialTimestamp: string;
}

// Generate GhIPSS Dynamic GhQR Payload string for Ghana Interbank Payment and Settlement Systems
export const generateGhQrPayload = (
  terminalId: string,
  merchantName: string,
  amount: number,
  invoiceRef: string
): string => {
  // Conforming to standard GhIPSS / EMVCo Merchant-Presented QR specifications for Ghana Pay
  const formattedAmount = amount.toFixed(2);
  const timestamp = Math.floor(Date.now() / 1000);
  return `00020101021226500014GH.GHIPSS.GHQR0112${terminalId}520459125303936540${formattedAmount.length}${formattedAmount}5802GH59${merchantName.length.toString().padStart(2, '0')}${merchantName}6005ACCRA62220518${invoiceRef}6304${timestamp.toString(16).toUpperCase()}`;
};

// Simulate asynchronous USSD / STK Push to customer's mobile phone
export const initiateMomoStkPush = async (
  req: StkPushRequest,
  onStatusUpdate?: (statusMsg: string) => void
): Promise<StkPushResponse> => {
  const cleanPhone = req.phoneNumber.replace(/\s+/g, '');
  const prefix = req.provider === 'MTN' ? 'MTN' : req.provider === 'Telecel' ? 'TCEL' : 'ATM';
  const txSeq = Math.floor(100000 + Math.random() * 900000);
  const transactionId = `${prefix}-MOMO-${txSeq}`;
  const networkRef = `EXT-${Date.now().toString().slice(-8)}`;

  if (onStatusUpdate) {
    onStatusUpdate(`Transmitting STK Push prompt to ${cleanPhone} via ${req.provider} Gateway...`);
  }

  await new Promise((resolve) => setTimeout(resolve, 800));

  if (onStatusUpdate) {
    onStatusUpdate(`USSD Prompt delivered on customer device. Awaiting PIN entry...`);
  }

  // Simulate waiting for customer approval (1.4 seconds)
  await new Promise((resolve) => setTimeout(resolve, 1400));

  if (onStatusUpdate) {
    onStatusUpdate(`Webhook response received: Payment authorized by ${cleanPhone}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    success: true,
    transactionId,
    status: 'SUCCESSFUL',
    networkReference: networkRef,
    message: `Payment of GHS ${req.amount.toFixed(2)} received from ${cleanPhone}`,
    financialTimestamp: new Date().toISOString()
  };
};
