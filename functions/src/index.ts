// ════════════════════════════════════════════
//  Firebase Cloud Functions v2 — Entry Point
//  File: functions/src/index.ts
//
//  Handles:
//  1. Razorpay Webhook (HMAC signature verification via rawBody)
//  2. Soundbox State Machine (party document update)
// ════════════════════════════════════════════

import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";

// ─── Initialize Firebase Admin SDK ───
initializeApp();
const db = getFirestore();

// ════════════════════════════════════════════
//  Razorpay Webhook Handler
//  POST /razorpayWebhook
//
//  Critical: Uses req.rawBody for HMAC-SHA256
//  signature validation, NOT req.body.
// ════════════════════════════════════════════

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        amount: number;
        method: string;
        status: string;
        notes: {
          outlet_id?: string;
          party_id?: string;
        };
      };
    };
  };
}

export const razorpayWebhook = onRequest(
  {
    // Allow unauthenticated access — Razorpay cannot authenticate
    invoker: "public",
    // Restrict to POST method conceptually (checked inside handler)
    maxInstances: 10,
  },
  async (req, res) => {
    // ─── Only accept POST ───
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // ─── Validate HMAC Signature ───
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured in environment");
      res.status(500).send("Server configuration error");
      return;
    }

    const receivedSignature = req.headers["x-razorpay-signature"] as string;
    if (!receivedSignature) {
      res.status(400).send("Missing signature header");
      return;
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.rawBody)
      .digest("hex");

    if (receivedSignature !== expectedSignature) {
      console.warn("Razorpay webhook: invalid HMAC signature");
      res.status(400).send("Invalid signature");
      return;
    }

    // ─── Parse and Process Payment ───
    try {
      const payload = req.body as RazorpayWebhookPayload;

      if (payload.event !== "payment.captured") {
        // Acknowledge non-payment events gracefully
        res.status(200).send("Event ignored");
        return;
      }

      const payment = payload.payload.payment.entity;
      const outletId = payment.notes?.outlet_id;
      const partyId = payment.notes?.party_id;

      if (!outletId || !partyId) {
        console.error("Webhook payload missing outlet_id or party_id in notes");
        res.status(400).send("Missing outlet_id or party_id in payment notes");
        return;
      }

      // ─── Idempotency Guard ───
      // Check if the party document already has this payment recorded.
      const partyRef = db
        .collection("outlets")
        .doc(outletId)
        .collection("parties")
        .doc(partyId);

      const partySnap = await partyRef.get();
      if (!partySnap.exists) {
        console.error(`Party document not found: outlets/${outletId}/parties/${partyId}`);
        res.status(404).send("Party not found");
        return;
      }

      const partyData = partySnap.data();
      if (partyData?.payment_received === true && partyData?.payment_id === payment.id) {
        // Already processed — idempotent response
        console.info(`Payment ${payment.id} already processed for party ${partyId}`);
        res.status(200).send("Already processed");
        return;
      }

      // ─── Update Party Document (Soundbox State Machine) ───
      await partyRef.update({
        payment_received: true,
        payment_id: payment.id,
        payment_amount: payment.amount,
        payment_method: payment.method,
        updated_at: FieldValue.serverTimestamp(),
      });

      console.info(
        `✅ Payment ${payment.id} recorded for party ${partyId} in outlet ${outletId}. ` +
        `Amount: ₹${(payment.amount / 100).toFixed(2)}, Method: ${payment.method}`
      );

      res.status(200).send("Payment processed");
    } catch (error) {
      console.error("Error processing Razorpay webhook:", error);
      res.status(500).send("Internal server error");
    }
  }
);
