import Stripe from 'stripe';

export const createPayment = async (req, res) => {
  try {
    const { email, amount } = req.body;

    console.log('Creando PaymentIntent para:', email, 'con monto:', amount);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'eur',
      receipt_email: email,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error creando el pago',
      error: error.message,
    });
  }
};
