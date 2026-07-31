import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

import { parseAdultMetadata, placeholderAdultEmail } from './adults.ts';
import { isSkippedPaymentSession, shouldRecordPayment } from './session.ts';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Webhook signature verification failed: ${message}`);
      return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const session = stripeData as Stripe.Checkout.Session;
    const { mode, payment_status } = session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (shouldRecordPayment(mode, payment_status)) {
      try {
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = session;

        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed',
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        await upsertPurchaseFromSession(session);
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    } else if (isSkippedPaymentSession(mode, payment_status)) {
      // Loud on purpose. A dropped session used to leave no trace at all, which
      // is how comped tickets went missing.
      console.error(
        `[stripe-webhook] NOT recording session ${session.id}: mode=${mode} payment_status=${payment_status}. No purchase, attendees or waiver email were created.`,
      );
    }
  }
}

async function upsertPurchaseFromSession(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {};
  const ticketType = metadata.ticket_type;

  if (!ticketType) {
    console.warn(`Checkout session ${session.id} is missing ticket_type metadata`);
    return;
  }

  const buyerEmail = metadata.attendee_email || session.customer_details?.email || "";
  const buyerName = metadata.attendee_name || session.customer_details?.name || "";
  const adultTicketCount = Number.parseInt(metadata.adult_ticket_count || "1", 10) || 1;
  const youthTicketCount = Number.parseInt(metadata.youth_ticket_count || "0", 10) || 0;
  const totalTicketCount =
    Number.parseInt(metadata.total_ticket_count || String(adultTicketCount + youthTicketCount), 10) ||
    adultTicketCount + youthTicketCount;

  const { error: purchaseError } = await supabase.from('purchases').upsert(
    {
      stripe_session_id: session.id,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      ticket_type: ticketType,
      quantity: totalTicketCount,
      referral_code: metadata.referral_code === "none" ? null : metadata.referral_code,
      adult_ticket_type: metadata.adult_ticket_type || ticketType,
      adult_ticket_count: adultTicketCount,
      youth_ticket_count: youthTicketCount,
      total_ticket_count: totalTicketCount,
      order_summary: {
        adult_ticket_type: metadata.adult_ticket_type || ticketType,
        adult_ticket_count: adultTicketCount,
        youth_ticket_count: youthTicketCount,
        total_ticket_count: totalTicketCount,
      },
    },
    { onConflict: 'stripe_session_id' },
  );

  if (purchaseError) {
    console.error('Error upserting purchase:', purchaseError);
    return;
  }

  const { data: purchase, error: getPurchaseError } = await supabase
    .from('purchases')
    .select('id')
    .eq('stripe_session_id', session.id)
    .maybeSingle();

  if (getPurchaseError || !purchase) {
    console.error('Error loading purchase:', getPurchaseError);
    return;
  }

  // Buyers now start pending: the waiver is signed on Smartwaiver after
  // payment, not inside the old checkout dialog.
  const { error: attendeeError } = await supabase.from('attendees').upsert(
    {
      purchase_id: purchase.id,
      name: buyerName,
      email: buyerEmail,
      phone: metadata.attendee_phone || session.customer_details?.phone || "",
      is_buyer: true,
      waiver_status: 'pending',
    },
    { onConflict: 'purchase_id,email' },
  );

  if (attendeeError) {
    console.error('Error upserting attendee:', attendeeError);
  }

  // One attendee row per additional adult. Each signs their own waiver, so each
  // needs its own row to be marked signed against.
  if (adultTicketCount > 1) {
    const staged = parseAdultMetadata(metadata, adultTicketCount);

    // Paid for N adults but the details did not survive? Still create rows, with
    // unroutable placeholder addresses, so the count is never wrong and the
    // registration desk's adult-shortfall warning stays accurate.
    const rows = [];
    for (let position = 2; position <= adultTicketCount; position++) {
      const provided = staged[position - 2];
      rows.push({
        purchase_id: purchase.id,
        name: provided?.name || `Adult ${position}`,
        email: provided?.email || placeholderAdultEmail(purchase.id, position),
        is_buyer: false,
        is_minor: false,
        waiver_status: 'pending',
      });
    }

    if (staged.length !== adultTicketCount - 1) {
      console.error(
        `[stripe-webhook] purchase ${purchase.id} expected ${adultTicketCount - 1} additional adults in metadata but found ${staged.length}; placeholders created`,
      );
    }

    const { error: adultsError } = await supabase
      .from('attendees')
      .upsert(rows, { onConflict: 'purchase_id,email' });

    if (adultsError) {
      console.error('Error upserting additional adults:', adultsError);
    }
  }

  // Email every pending adult on this purchase individually. Addressing them by
  // attendee id rather than purchase id is what stops all of them resolving to
  // the buyer.
  const { data: pendingAdults, error: listError } = await supabase
    .from('attendees')
    .select('id')
    .eq('purchase_id', purchase.id)
    .eq('is_minor', false);

  if (listError) {
    console.error('Error listing adults for waiver emails:', listError);
    return;
  }

  for (const adult of (pendingAdults || []) as Array<{ id: string }>) {
    await sendWaiverEmail(adult.id);
  }
}

/**
 * Kicks off one waiver email. Deliberately swallows every failure: throwing here
 * would surface as a non-2xx to Stripe, which then retries the whole payment
 * webhook. waiver-reconcile sweeps up anything that did not send.
 */
async function sendWaiverEmail(attendeeId: string) {
  const internalToken = Deno.env.get('INTERNAL_FUNCTION_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!internalToken || !supabaseUrl) {
    console.error(
      '[stripe-webhook] INTERNAL_FUNCTION_TOKEN or SUPABASE_URL missing; no waiver email sent',
    );
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-waiver-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': internalToken,
      },
      body: JSON.stringify({ attendeeId }),
    });

    if (!res.ok) {
      console.error(
        `[stripe-webhook] send-waiver-email for attendee ${attendeeId} returned HTTP ${res.status}: ${await res.text()}`,
      );
    }
  } catch (error) {
    console.error(`[stripe-webhook] send-waiver-email threw: ${String(error)}`);
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}