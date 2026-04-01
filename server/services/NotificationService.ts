import db from '../lib/db';
import nodemailer from 'nodemailer';

const prisma = db;

/**
 * NotificationService — email + SMS notifications with templates and logging.
 * 
 * Uses nodemailer for email, Twilio for SMS.
 * All notifications are logged to NotificationLog.
 */
export class NotificationService {

  private static getMailTransport() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private static getTwilioClient() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) return null;
    try {
      const twilio = require('twilio');
      return twilio(sid, token);
    } catch {
      return null;
    }
  }

  /**
   * Send email via nodemailer with logging.
   */
  static async sendEmail(to: string, subject: string, html: string, userId?: string, templateKey?: string) {
    const logEntry = await prisma.notificationLog.create({
      data: {
        userId: userId || null,
        channel: 'email',
        templateKey: templateKey || null,
        recipient: to,
        subject,
        body: html,
        status: 'pending',
      },
    });

    try {
      if (!process.env.SMTP_USER) {
        console.log(`[EMAIL-DRY] To: ${to}, Subject: ${subject}`);
        await prisma.notificationLog.update({
          where: { id: logEntry.id },
          data: { status: 'dry_run', sentAt: new Date() },
        });
        return true;
      }

      const transport = this.getMailTransport();
      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
      });

      await prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: { status: 'sent', sentAt: new Date() },
      });
      return true;
    } catch (error: any) {
      console.error(`[EMAIL ERROR] ${error.message}`);
      await prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: { status: 'failed', error: error.message },
      });
      return false;
    }
  }

  /**
   * Send SMS via Twilio with logging.
   */
  static async sendSMS(to: string, message: string, userId?: string, templateKey?: string) {
    const logEntry = await prisma.notificationLog.create({
      data: {
        userId: userId || null,
        channel: 'sms',
        templateKey: templateKey || null,
        recipient: to,
        body: message,
        status: 'pending',
      },
    });

    try {
      const client = this.getTwilioClient();
      if (!client) {
        console.log(`[SMS-DRY] To: ${to}, Message: ${message}`);
        await prisma.notificationLog.update({
          where: { id: logEntry.id },
          data: { status: 'dry_run', sentAt: new Date() },
        });
        return true;
      }

      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });

      await prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: { status: 'sent', sentAt: new Date() },
      });
      return true;
    } catch (error: any) {
      console.error(`[SMS ERROR] ${error.message}`);
      await prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: { status: 'failed', error: error.message },
      });
      return false;
    }
  }

  /**
   * Send notification using a template from DB.
   */
  static async sendFromTemplate(templateKey: string, recipient: string, variables: Record<string, string>, userId?: string) {
    const template = await prisma.notificationTemplate.findUnique({ where: { key: templateKey } });
    if (!template || !template.isActive) {
      console.warn(`Template '${templateKey}' not found or inactive`);
      return false;
    }

    let body = template.body;
    let subject = template.subject || '';
    for (const [key, value] of Object.entries(variables)) {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
      subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    if (template.channel === 'email') {
      return this.sendEmail(recipient, subject, body, userId, templateKey);
    } else if (template.channel === 'sms') {
      return this.sendSMS(recipient, body, userId, templateKey);
    }
    return false;
  }

  // --- Trigger-based helpers ---

  static async notifyDealerNewLead(dealerEmail: string, dealerPhone: string, leadDetails: any) {
    const subject = `New Lead: ${leadDetails.carYear} ${leadDetails.carMake} ${leadDetails.carModel}`;
    const html = `
      <h2>New Lead Available</h2>
      <p>A new lead matches your criteria.</p>
      <ul>
        <li>Vehicle: ${leadDetails.carYear} ${leadDetails.carMake} ${leadDetails.carModel}</li>
        <li>MSRP: $${leadDetails.carMsrp}</li>
        <li>Target Payment: $${leadDetails.calcPayment}/mo</li>
      </ul>
      <p>Login to your dealer portal to accept or reject.</p>
    `;

    await this.sendEmail(dealerEmail, subject, html);
    if (dealerPhone) {
      await this.sendSMS(dealerPhone, `New Lead: ${leadDetails.carYear} ${leadDetails.carMake} ${leadDetails.carModel}. Check your portal.`);
    }
  }

  static async notifyClientStatusChange(clientEmail: string, clientPhone: string, status: string, vehicleDetails: string) {
    const subject = `Application Update: ${vehicleDetails}`;
    const html = `
      <h2>Application Status Update</h2>
      <p>Your application for ${vehicleDetails} has been updated.</p>
      <p>New Status: <strong>${status}</strong></p>
      <p>Login to your dashboard for more details.</p>
    `;

    await this.sendEmail(clientEmail, subject, html);
    if (clientPhone) {
      await this.sendSMS(clientPhone, `Your application for ${vehicleDetails} is now ${status}.`);
    }
  }

  static async notifyDepositReceived(clientEmail: string, vehicleDescription: string) {
    const subject = `Deposit Received - ${vehicleDescription}`;
    const html = `
      <h2>Deposit Confirmed</h2>
      <p>Your $95 deposit for <strong>${vehicleDescription}</strong> has been received.</p>
      <p>Our team will contact you shortly to finalize your deal.</p>
    `;
    await this.sendEmail(clientEmail, subject, html);
  }

  static async notifyDealerAccepted(clientEmail: string, clientPhone: string, dealerName: string, vehicleDescription: string) {
    const subject = `Dealer Accepted Your Lead - ${vehicleDescription}`;
    const html = `
      <h2>Great News!</h2>
      <p><strong>${dealerName}</strong> has accepted your inquiry for ${vehicleDescription}.</p>
      <p>They will contact you shortly to discuss next steps.</p>
    `;
    await this.sendEmail(clientEmail, subject, html);
    if (clientPhone) {
      await this.sendSMS(clientPhone, `${dealerName} accepted your inquiry for ${vehicleDescription}. Expect a call soon!`);
    }
  }
}
