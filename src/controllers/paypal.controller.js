import PayPalOrder from "../models/PayPalOrder.js";
import { createPayPalOrder, capturePayPalOrder } from "../services/paypal.service.js";

const getApprovalUrl = (links = []) => {
  const approveLink = links.find((link) => link.rel === "approve");
  return approveLink?.href || null;
};

const getPayerDetails = (captureResponse) => {
  const payer = captureResponse?.payer || {};
  const payerId = payer?.payer_id || null;
  const payerEmail = payer?.email_address || null;

  return { payerId, payerEmail };
};

export const createOrder = async (req, res) => {
  try {
    const { total, currency = "EUR" } = req.body;

    if (total === undefined || total === null || Number.isNaN(Number(total))) {
      return res.status(400).json({ message: "Total is required" });
    }

    const normalizedTotal = Number(total);
    if (normalizedTotal <= 0) {
      return res.status(400).json({ message: "Total must be greater than 0" });
    }

    const order = await createPayPalOrder({ total: normalizedTotal, currency });

    const newOrder = new PayPalOrder({
      orderId: order.id,
      status: order.status,
      amount: normalizedTotal,
      currency,
      userId: req.user?._id || null,
      clientId: req.client?._id || null,
      profileId: null,
      rawCreateResponse: order
    });

    await newOrder.save();

    res.status(201).json({
      orderId: order.id,
      status: order.status,
      approveUrl: getApprovalUrl(order.links),
      links: order.links || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error creating PayPal order" });
  }
};

export const captureOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    const capture = await capturePayPalOrder(orderId);
    const { payerId, payerEmail } = getPayerDetails(capture);

    const existingOrder = await PayPalOrder.findOne({ orderId });

    if (existingOrder) {
      existingOrder.status = capture.status || existingOrder.status;
      existingOrder.payerId = payerId;
      existingOrder.payerEmail = payerEmail;
      existingOrder.rawCaptureResponse = capture;
      await existingOrder.save();
    } else {
      await PayPalOrder.create({
        orderId,
        status: capture.status,
        payerId,
        payerEmail,
        userId: req.user?._id || null,
        clientId: req.client?._id || null,
        rawCaptureResponse: capture
      });
    }

    res.status(200).json({
      orderId,
      status: capture.status,
      payerId,
      payerEmail,
      capture
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Error capturing PayPal order" });
  }
};
