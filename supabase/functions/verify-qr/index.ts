import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with the user's token to verify auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { qrData } = await req.json();
    
    if (!qrData) {
      return new Response(JSON.stringify({ error: 'QR data is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Verifying QR for user:', user.id);

    let payload;
    try {
      payload = JSON.parse(qrData);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid QR data format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sessionId, timestamp, secret, expiresAt, signature } = payload;

    // Check expiration
    if (Date.now() > expiresAt) {
      return new Response(JSON.stringify({ error: 'QR code has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify signature
    const payloadToVerify = { sessionId, timestamp, secret, expiresAt };
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(supabaseServiceKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(JSON.stringify(payloadToVerify))
    );

    if (!isValid) {
      console.error('Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid QR code signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('*, classes!inner(id, subject)')
      .eq('id', sessionId)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return new Response(JSON.stringify({ error: 'Session not found or inactive' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify secret matches
    if (session.qr_secret !== secret) {
      return new Response(JSON.stringify({ error: 'QR code is no longer valid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if student is enrolled
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('class_enrollments')
      .select('id')
      .eq('class_id', session.class_id)
      .eq('student_id', user.id)
      .maybeSingle();

    if (enrollmentError || !enrollment) {
      console.error('Enrollment error:', enrollmentError);
      return new Response(JSON.stringify({ error: 'You are not enrolled in this class' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already checked in
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', user.id)
      .maybeSingle();

    if (existingRecord) {
      return new Response(JSON.stringify({ 
        error: 'Already checked in for this session',
        alreadyCheckedIn: true 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine status (late if more than 10 minutes after session start)
    const sessionStartTime = new Date(`${session.date}T${session.start_time}`);
    const isLate = Date.now() - sessionStartTime.getTime() > 10 * 60 * 1000;

    // Record attendance
    const { data: record, error: recordError } = await supabase
      .from('attendance_records')
      .insert({
        session_id: sessionId,
        class_id: session.class_id,
        student_id: user.id,
        method_used: 'qr',
        status: isLate ? 'late' : 'present',
      })
      .select()
      .single();

    if (recordError) {
      console.error('Record error:', recordError);
      return new Response(JSON.stringify({ error: 'Failed to record attendance' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Attendance recorded successfully:', record.id);

    return new Response(JSON.stringify({ 
      success: true, 
      record,
      className: session.classes.subject,
      status: isLate ? 'late' : 'present'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error verifying QR:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
