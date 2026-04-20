/**
 * WhatsApp Business Cloud API Service
 * Handles media uploads, document sending, and template messages.
 */
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { config } from '../config';

const WA = config.whatsapp;
const BASE_URL = `https://graph.facebook.com/${WA.apiVersion}/${WA.phoneNumberId}`;

/** Authorization header for all WhatsApp API calls */
function authHeaders() {
  return { Authorization: `Bearer ${WA.accessToken}` };
}

/** Check if WhatsApp credentials are configured */
export function isWhatsAppConfigured(): boolean {
  return !!(WA.phoneNumberId && WA.accessToken);
}

/**
 * Normalize a phone number to WhatsApp's required format.
 * Strips +, spaces, dashes. Prefills +91 for 10-digit Indian numbers.
 */
export function formatPhoneNumber(phone: string): string {
  // Strip all non-digit characters
  let cleaned = phone.replace(/[^\d]/g, '');

  // If 10 digits, assume Indian number → prefix with 91
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }

  return cleaned;
}

/**
 * Upload a media file (PDF/image buffer) to WhatsApp's media endpoint.
 * Returns the media_id for use in message payloads.
 */
export async function uploadMedia(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<string> {
  const form = new FormData();
  form.append('file', buffer, { filename, contentType: mimeType });
  form.append('type', mimeType);
  form.append('messaging_product', 'whatsapp');

  const response = await axios.post(`${BASE_URL}/media`, form, {
    headers: {
      ...form.getHeaders(),
      ...authHeaders(),
    },
    maxBodyLength: Infinity,
  });

  return response.data.id;
}

/**
 * Send a document (PDF) to a WhatsApp number using a media_id.
 */
export async function sendDocument(
  to: string,
  mediaId: string,
  filename: string,
  caption: string,
): Promise<{ messageId: string }> {
  const response = await axios.post(
    `${BASE_URL}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: {
        id: mediaId,
        filename,
        caption,
      },
    },
    { headers: { ...authHeaders(), 'Content-Type': 'application/json' } },
  );

  return { messageId: response.data.messages?.[0]?.id || 'unknown' };
}

/**
 * Send a pre-approved template message with a document header.
 *
 * Template: student_attendance_report
 * Header: Document
 * Body params: parent_name, student_name, enrollment_no, attendance_pct
 */
export async function sendTemplateWithDocument(
  to: string,
  mediaId: string,
  filename: string,
  params: {
    parentName: string;
    studentName: string;
    enrollmentNo: string;
    attendancePct: string;
  },
): Promise<{ messageId: string }> {
  const response = await axios.post(
    `${BASE_URL}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: 'student_attendance_report',
        language: { code: 'en' },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'document',
                document: { id: mediaId, filename },
              },
            ],
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: params.parentName },
              { type: 'text', text: params.studentName },
              { type: 'text', text: params.enrollmentNo },
              { type: 'text', text: params.attendancePct },
            ],
          },
        ],
      },
    },
    { headers: { ...authHeaders(), 'Content-Type': 'application/json' } },
  );

  return { messageId: response.data.messages?.[0]?.id || 'unknown' };
}

/**
 * Parse a WhatsApp API error into a human-readable message.
 */
export function parseWhatsAppError(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data?.error;
    if (data) {
      return `[${data.code}] ${data.message || data.error_data?.details || 'Unknown WhatsApp API error'}`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
