import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { render } from "@react-email/render";
import * as React from "react";
// Import email templates from src/emails directory
import BookingConfirmationUser from "../src/emails/booking-confirmation-user";
import BookingConfirmationTrainer from "../src/emails/booking-confirmation-trainer";

// Initialize Resend client
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new Resend(apiKey);
};

/**
 * Send booking confirmation email to user
 */
export const sendBookingConfirmationToUser = internalAction({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    trainerName: v.string(),
    sessionName: v.string(),
    sessionsPerWeek: v.number(),
    duration: v.number(),
    isAdvancedBooking: v.optional(v.boolean()),
    slots: v.array(
      v.object({
        date: v.string(),
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`[EMAIL DEBUG] Starting sendBookingConfirmationToUser`);
      console.log(`[EMAIL DEBUG] Args:`, JSON.stringify(args, null, 2));

      // Validate email address
      if (!args.userEmail || args.userEmail.trim() === "") {
        throw new Error("User email is required");
      }

      const resend = getResendClient();
      console.log(`[EMAIL DEBUG] Resend client initialized`);

      // Render email template to HTML
      console.log(`[EMAIL DEBUG] Rendering email template...`);
      const emailHtml = await render(
        React.createElement(BookingConfirmationUser, {
          userName: args.userName,
          trainerName: args.trainerName,
          sessionName: args.sessionName,
          sessionsPerWeek: args.sessionsPerWeek,
          duration: args.duration,
          isAdvancedBooking: args.isAdvancedBooking || false,
          slots: args.slots,
        })
      );
      console.log(
        `[EMAIL DEBUG] Email template rendered, HTML length: ${emailHtml.length}`
      );

      // Send email
      // For testing: Use Resend's default domain (onboarding.resend.dev)
      // For production: Use your verified domain (e.g., noreply@breezewayfitness.com)
      const fromEmail =
        process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

      console.log(`[EMAIL DEBUG] Sending email to user: ${args.userEmail}`);
      console.log(`[EMAIL DEBUG] From email: ${fromEmail}`);
      console.log(`[EMAIL DEBUG] User name: ${args.userName}`);
      console.log(`[EMAIL DEBUG] Trainer name: ${args.trainerName}`);

      const result = await resend.emails.send({
        from: fromEmail,
        to: args.userEmail,
        subject: `Booking Confirmation - ${args.trainerName}`,
        html: emailHtml,
      });

      console.log(
        `[EMAIL DEBUG] Resend result:`,
        JSON.stringify(result, null, 2)
      );

      if (result.error) {
        console.error("Error sending email to user:", result.error);
        throw new Error(`Failed to send email: ${result.error.message}`);
      }

      return { success: true, emailId: result.data?.id };
    } catch (error) {
      console.error("Error in sendBookingConfirmationToUser:", error);
      throw error;
    }
  },
});

/**
 * Send booking notification email to trainer
 */
export const sendBookingNotificationToTrainer = internalAction({
  args: {
    trainerEmail: v.string(),
    trainerName: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    sessionName: v.string(),
    sessionsPerWeek: v.number(),
    duration: v.number(),
    isAdvancedBooking: v.optional(v.boolean()),
    slots: v.array(
      v.object({
        date: v.string(),
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`[EMAIL DEBUG] Starting sendBookingNotificationToTrainer`);
      console.log(`[EMAIL DEBUG] Args:`, JSON.stringify(args, null, 2));

      // Validate email address
      if (!args.trainerEmail || args.trainerEmail.trim() === "") {
        throw new Error("Trainer email is required");
      }

      const resend = getResendClient();
      console.log(`[EMAIL DEBUG] Resend client initialized`);

      // Render email template to HTML
      console.log(`[EMAIL DEBUG] Rendering email template...`);
      const emailHtml = await render(
        React.createElement(BookingConfirmationTrainer, {
          trainerName: args.trainerName,
          userName: args.userName,
          userEmail: args.userEmail,
          sessionName: args.sessionName,
          sessionsPerWeek: args.sessionsPerWeek,
          duration: args.duration,
          isAdvancedBooking: args.isAdvancedBooking || false,
          slots: args.slots,
        })
      );
      console.log(
        `[EMAIL DEBUG] Email template rendered, HTML length: ${emailHtml.length}`
      );

      // Send email
      // For testing: Use Resend's default domain (onboarding.resend.dev)
      // For production: Use your verified domain (e.g., noreply@breezewayfitness.com)
      const fromEmail =
        process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

      console.log(
        `[EMAIL DEBUG] Sending email to trainer: ${args.trainerEmail}`
      );
      console.log(`[EMAIL DEBUG] From email: ${fromEmail}`);
      console.log(`[EMAIL DEBUG] Trainer name: ${args.trainerName}`);
      console.log(`[EMAIL DEBUG] User name: ${args.userName}`);

      const result = await resend.emails.send({
        from: fromEmail,
        to: args.trainerEmail,
        subject: `New Booking - ${args.userName}`,
        html: emailHtml,
      });

      console.log(
        `[EMAIL DEBUG] Resend result:`,
        JSON.stringify(result, null, 2)
      );

      if (result.error) {
        console.error("Error sending email to trainer:", result.error);
        throw new Error(`Failed to send email: ${result.error.message}`);
      }

      return { success: true, emailId: result.data?.id };
    } catch (error) {
      console.error("Error in sendBookingNotificationToTrainer:", error);
      throw error;
    }
  },
});
