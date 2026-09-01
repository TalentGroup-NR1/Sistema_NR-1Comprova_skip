import { createClient } from 'npm:@supabase/supabase-js@2'
import { maskEmail } from '../_shared/mask.ts'

// Suppression event payload sent by Resend webhook
interface SuppressionPayload {
  email: string
  reason: 'bounce' | 'complaint' | 'unsubscribe' | string
  message_id?: string
}

function parseResendPayload(body: string): SuppressionPayload {
  const parsed = JSON.parse(body)
  const type = parsed.type
  if (!type || !parsed.data) {
    throw new Error('Missing type or data field in payload')
  }
  const data = parsed.data
  
  let reason = 'unknown'
  if (type === 'email.bounced') reason = 'bounce'
  else if (type === 'email.complained') reason = 'complaint'
  else if (type === 'email.unsubscribed') reason = 'unsubscribe' // If Resend supports it

  return {
    email: Array.isArray(data.to) ? data.to[0] : data.to,
    reason,
    message_id: data.email_id
  }
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  const headerSecret = req.headers.get('X-Webhook-Secret')
  if (!headerSecret || headerSecret.trim() !== webhookSecret.trim()) {
    console.error('Invalid or missing X-Webhook-Secret')
    return jsonResponse({ error: 'Unauthorized: missing or invalid X-Webhook-Secret' }, 401)
  }

  let payload: SuppressionPayload
  try {
    const textBody = await req.text()
    payload = parseResendPayload(textBody)
  } catch (error) {
    console.error('Invalid payload', { error })
    return jsonResponse({ error: 'Invalid payload' }, 400)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const normalizedEmail = payload.email.toLowerCase()

  // 1. Upsert to suppressed_emails (idempotent — safe for retries)
  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert(
      {
        email: normalizedEmail,
        reason: payload.reason,
      },
      { onConflict: 'email' },
    )

  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      error: suppressError,
      email_redacted: maskEmail(normalizedEmail),
    })
    return jsonResponse({ error: 'Failed to write suppression' }, 500)
  }

  // 2. Append a new log entry for the suppression event (never update existing rows)
  const sendLogStatus = mapReasonToStatus(payload.reason)
  const sendLogMessage = mapReasonToMessage(payload.reason)

  const { error: insertError } = await supabase
    .from('email_send_log')
    .insert({
      message_id: payload.message_id ?? null,
      template_name: 'system',
      recipient_email: normalizedEmail,
      status: sendLogStatus,
      error_message: sendLogMessage,
    })

  if (insertError) {
    // Non-fatal — log and continue. The suppression was already recorded.
    console.warn('Failed to insert email_send_log', {
      error: insertError,
    })
  }

  console.log('Suppression processed', {
    email_redacted: maskEmail(normalizedEmail),
    reason: payload.reason,
    has_message_id: !!payload.message_id,
  })

  return jsonResponse({ success: true })
})

function mapReasonToStatus(
  reason: string,
): 'bounced' | 'complained' | 'suppressed' {
  switch (reason) {
    case 'bounce':
      return 'bounced'
    case 'complaint':
      return 'complained'
    default:
      return 'suppressed'
  }
}

function mapReasonToMessage(reason: string): string {
  switch (reason) {
    case 'bounce':
      return 'Permanent bounce — email address is invalid or rejected'
    case 'complaint':
      return 'Spam complaint — recipient marked email as spam'
    case 'unsubscribe':
      return 'Recipient unsubscribed'
    default:
      return 'Email suppressed'
  }
}
