import Razorpay from "razorpay";
import crypto from "crypto";
import { PaymentProviderPort } from "../ports/paymentProviderPort.js";
import { PAYMENT_STATUS } from "../../../constants/payment.js";

let razorpayInstance = null;

function getRazorpayInstance() {
  if (!razorpayInstance) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      throw new Error("Razorpay credentials not configured in environment");
    }
    razorpayInstance = new Razorpay({ key_id, key_secret });
  }
  return razorpayInstance;
}

export class RazorpayAdapter extends PaymentProviderPort {
  get providerName() {
    return "RAZORPAY";
  }

  async initiatePayment({ merchantOrderId, amountPaise, redirectUrl }) {
    const rzp = getRazorpayInstance();

    const options = {
      amount: amountPaise,
      currency: "INR",
      receipt: merchantOrderId,
      payment_capture: 1, // Auto capture
      notes: {
        merchantOrderId,
      },
    };

    try {
      const order = await rzp.orders.create(options);
      
      // We don't have a redirectUrl like PhonePe, we return the order id
      // to the frontend so it can open the modal.
      return {
        redirectUrl: "", // Frontend will not redirect, it will use the orderId
        gatewayResponse: {
          razorpayOrderId: order.id,
        },
      };
    } catch (error) {
      const errorMessage = error.error?.description || error.message || JSON.stringify(error);
      const err = new Error(`Razorpay initiation failed: ${errorMessage}`);
      err.cause = error;
      throw err;
    }
  }

  async getPaymentStatus({ merchantOrderId, payment }) {
    const rzp = getRazorpayInstance();
    const razorpayOrderId = payment?.rawGatewayResponse?.razorpayOrderId;
    
    if (!razorpayOrderId) {
      return {
        state: "UNKNOWN",
        gatewayResponse: {},
      };
    }

    try {
      const order = await rzp.orders.fetch(razorpayOrderId);
      return {
        state: order.status, // "created", "attempted", "paid"
        gatewayResponse: order,
        transactionId: null,
      };
    } catch (error) {
      return {
        state: "UNKNOWN",
        gatewayResponse: { error: error.message },
      };
    }
  }

  async validateWebhook({ rawBody, authorization }) {
    // Razorpay webhook validation uses x-razorpay-signature and webhook secret
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return false;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    return expectedSignature === authorization;
  }

  async decodeWebhookPayload({ rawBody }) {
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    
    // We handle payment.captured
    if (event === "payment.captured" || event === "payment.failed") {
      const paymentEntity = payload.payload.payment.entity;
      return {
        merchantOrderId: paymentEntity.notes?.merchantOrderId || paymentEntity.description, // Requires passing merchantOrderId in notes
        state: paymentEntity.status, // "captured" or "failed"
        transactionId: paymentEntity.id,
        raw: payload,
      };
    } else if (event === "order.paid") {
      const orderEntity = payload.payload.order.entity;
      return {
        merchantOrderId: orderEntity.receipt,
        state: orderEntity.status, // "paid"
        transactionId: null,
        raw: payload,
      }
    }

    return {
      state: "ignored",
      raw: payload,
    };
  }

  mapStatusToInternal(gatewayState) {
    const state = String(gatewayState).toUpperCase();
    if (["CAPTURED", "PAID"].includes(state)) {
      return PAYMENT_STATUS.CAPTURED;
    }
    if (["FAILED"].includes(state)) {
      return PAYMENT_STATUS.FAILED;
    }
    if (["CREATED", "ATTEMPTED"].includes(state)) {
      return PAYMENT_STATUS.PENDING;
    }
    return PAYMENT_STATUS.PENDING;
  }
}
